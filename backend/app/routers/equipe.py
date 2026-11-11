from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..core.seguranca import verificar_admin
from ..core.tempo import agora_naive
from ..database import get_db
from ..models import Aluno, AvaliacaoFisica, Ficha, Professor, Recepcionista, User
from ..schemas.equipe import (
    PermissoesAtualizar, ProfessorAtualizar, ProfessorDetalhe, ProfessorItem, RecepcionistaAtualizar,
    RecepcionistaCriar, RecepcionistaDetalhe, RecepcionistaItem, TransferirAlunos,
)
from ..schemas.plano import StatusAtualizar
from ..services import auditoria
from ..services import equipe as servico
from ..services.fichas import transferir_fichas_do_aluno

router = APIRouter()


# ---------- professores ----------

def _consulta_professores():
    total_alunos = select(func.count(Aluno.id)).where(Aluno.professor_id == Professor.id).correlate(Professor).scalar_subquery()
    total_fichas = (
        select(func.count(Ficha.id)).where(Ficha.professor_id == Professor.id, Ficha.ativo.is_(True))
        .correlate(Professor).scalar_subquery()
    )
    total_avaliacoes = (
        select(func.count(AvaliacaoFisica.id)).where(AvaliacaoFisica.professor_id == Professor.id)
        .correlate(Professor).scalar_subquery()
    )
    return (
        select(Professor, User, total_alunos, total_fichas, total_avaliacoes)
        .join(User, User.id == Professor.user_id)
    )


def _item_professor(professor: Professor, usuario: User, alunos: int, fichas: int, avaliacoes: int) -> dict:
    return {
        "id": professor.id, "nome": professor.nome, "email": usuario.email, "telefone": professor.telefone,
        "foto": usuario.foto, "ativo": usuario.ativo, "criado_em": usuario.criado_em,
        "total_alunos": alunos, "total_fichas": fichas, "total_avaliacoes": avaliacoes,
    }


def _linha_professor(db: Session, professor_id: int) -> dict:
    linha = db.execute(_consulta_professores().where(Professor.id == professor_id)).first()
    if not linha:
        raise HTTPException(status_code=404, detail="Professor não encontrado")
    return _item_professor(*linha)


@router.get("/admin/professores", response_model=list[ProfessorItem])
def listar_professores(
    ativo: bool | None = None, admin=Depends(verificar_admin), db: Session = Depends(get_db),
):
    consulta = _consulta_professores().order_by(Professor.nome, Professor.id)
    if ativo is not None:
        consulta = consulta.where(User.ativo.is_(ativo))

    return [_item_professor(*linha) for linha in db.execute(consulta).all()]


@router.get("/admin/professores/{professor_id}", response_model=ProfessorDetalhe)
def obter_professor(professor_id: int, admin=Depends(verificar_admin), db: Session = Depends(get_db)):

    dados = _linha_professor(db, professor_id)
    professor = db.get(Professor, professor_id)

    alunos = db.execute(
        select(Aluno, User).join(User, User.id == Aluno.user_id)
        .where(Aluno.professor_id == professor_id).order_by(Aluno.nome)
    ).all()
    fichas = db.execute(
        select(Ficha, Aluno).join(Aluno, Aluno.id == Ficha.aluno_id)
        .where(Ficha.professor_id == professor_id, Ficha.ativo.is_(True))
        .order_by(func.coalesce(Ficha.atualizado_em, Ficha.data_criacao).desc(), Ficha.id.desc())
    ).all()
    avaliacoes = db.execute(
        select(AvaliacaoFisica, Aluno).join(Aluno, Aluno.id == AvaliacaoFisica.aluno_id)
        .where(AvaliacaoFisica.professor_id == professor_id)
        .order_by(AvaliacaoFisica.data_avaliacao.desc(), AvaliacaoFisica.id.desc()).limit(10)
    ).all()

    dados.update({
        "alunos": [
            {"id": a.id, "nome": a.nome, "telefone": a.telefone, "ativo": u.ativo,
             "status_cadastro": a.status_cadastro, "professor_vinculado_em": a.professor_vinculado_em}
            for a, u in alunos
        ],
        "fichas": [
            {"id": f.id, "nome": f.nome, "aluno": {"id": a.id, "nome": a.nome}, "status": f.status,
             "atualizado_em": f.atualizado_em or f.data_criacao}
            for f, a in fichas
        ],
        "avaliacoes_recentes": [
            {"id": av.id, "aluno": {"id": a.id, "nome": a.nome}, "data_avaliacao": av.data_avaliacao,
             "peso": av.peso, "altura": av.altura}
            for av, a in avaliacoes
        ],
        "atividade": auditoria.atividade_do_usuario(db, professor.user_id),
    })

    return dados


@router.put("/admin/professores/{professor_id}", response_model=ProfessorItem)
def editar_professor(
    professor_id: int, dados: ProfessorAtualizar, admin=Depends(verificar_admin), db: Session = Depends(get_db),
):
    professor = servico.obter_professor(db, professor_id)
    servico.exigir_email_livre(db, dados.email, professor.user_id)

    professor.nome = dados.nome
    professor.telefone = dados.telefone
    db.get(User, professor.user_id).email = dados.email
    servico.flush_unico(db)

    auditoria.registrar(db, admin, "professor.editar", "professor", professor.id, f"Professor {professor.nome} editado")
    db.commit()

    return _linha_professor(db, professor_id)


@router.put("/admin/professores/{professor_id}/status", response_model=ProfessorItem)
def alterar_status_professor(
    professor_id: int, dados: StatusAtualizar, admin=Depends(verificar_admin), db: Session = Depends(get_db),
):
    professor = servico.obter_professor(db, professor_id)
    servico.alterar_status(db, admin, "professor", professor, dados.ativo)
    db.commit()

    return _linha_professor(db, professor_id)


@router.post("/admin/professores/{professor_id}/transferir-alunos")
def transferir_alunos(
    professor_id: int, dados: TransferirAlunos, admin=Depends(verificar_admin), db: Session = Depends(get_db),
):
    origem = servico.obter_professor(db, professor_id)

    if dados.destino_professor_id is not None:
        destino = servico.obter_professor(db, dados.destino_professor_id)
        if destino.id == origem.id:
            raise HTTPException(status_code=422, detail="Destino deve ser diferente da origem")
        if not db.get(User, destino.user_id).ativo:
            raise HTTPException(status_code=422, detail="Professor inativo")

    consulta = select(Aluno).where(Aluno.professor_id == origem.id)
    if dados.aluno_ids is not None:
        consulta = consulta.where(Aluno.id.in_(dados.aluno_ids))
    alunos = db.scalars(consulta).all()

    if dados.aluno_ids is not None and len({a.id for a in alunos}) != len(set(dados.aluno_ids)):
        raise HTTPException(status_code=422, detail="Aluno não pertence ao professor de origem")

    agora = agora_naive()
    for aluno in alunos:
        aluno.professor_id = dados.destino_professor_id
        aluno.professor_vinculado_em = agora if dados.destino_professor_id is not None else None

    # ADR-038: as fichas ativas acompanham os alunos para o novo professor
    fichas_transferidas = transferir_fichas_do_aluno(db, [a.id for a in alunos], dados.destino_professor_id)

    auditoria.registrar(
        db, admin, "professor.transferir_alunos", "professor", origem.id,
        f"{len(alunos)} aluno(s) transferido(s) de {origem.nome}",
        {"origem_professor_id": origem.id, "destino_professor_id": dados.destino_professor_id,
         "aluno_ids": [a.id for a in alunos], "fichas_transferidas": fichas_transferidas},
    )
    db.commit()

    return {"transferidos": len(alunos)}


# ---------- recepcionistas ----------

def _item_recepcionista(recepcionista: Recepcionista, usuario: User) -> dict:
    return {
        "id": recepcionista.id, "user_id": usuario.id, "nome": recepcionista.nome, "email": usuario.email,
        "telefone": recepcionista.telefone, "ativo": usuario.ativo,
        "permissoes": list(recepcionista.permissoes or []), "criado_em": usuario.criado_em,
    }


def _linha_recepcionista(db: Session, recepcionista_id: int) -> dict:
    linha = db.execute(
        select(Recepcionista, User).join(User, User.id == Recepcionista.user_id).where(Recepcionista.id == recepcionista_id)
    ).first()
    if not linha:
        raise HTTPException(status_code=404, detail="Recepcionista não encontrado")
    return _item_recepcionista(*linha)


@router.get("/admin/recepcionistas", response_model=list[RecepcionistaItem])
def listar_recepcionistas(ativo: bool | None = None, admin=Depends(verificar_admin), db: Session = Depends(get_db)):

    consulta = (
        select(Recepcionista, User).join(User, User.id == Recepcionista.user_id)
        .order_by(Recepcionista.nome, Recepcionista.id)
    )
    if ativo is not None:
        consulta = consulta.where(User.ativo.is_(ativo))

    return [_item_recepcionista(r, u) for r, u in db.execute(consulta).all()]


@router.post("/admin/recepcionistas", response_model=RecepcionistaItem)
def criar_recepcionista(dados: RecepcionistaCriar, admin=Depends(verificar_admin), db: Session = Depends(get_db)):

    recepcionista = servico.criar_recepcionista(db, admin, dados)
    db.commit()

    return _linha_recepcionista(db, recepcionista.id)


@router.get("/admin/recepcionistas/{recepcionista_id}", response_model=RecepcionistaDetalhe)
def obter_recepcionista(recepcionista_id: int, admin=Depends(verificar_admin), db: Session = Depends(get_db)):

    dados = _linha_recepcionista(db, recepcionista_id)
    recepcionista = db.get(Recepcionista, recepcionista_id)
    dados["atividade"] = auditoria.atividade_do_usuario(db, recepcionista.user_id)

    return dados


@router.put("/admin/recepcionistas/{recepcionista_id}", response_model=RecepcionistaItem)
def editar_recepcionista(
    recepcionista_id: int, dados: RecepcionistaAtualizar,
    admin=Depends(verificar_admin), db: Session = Depends(get_db),
):
    recepcionista = servico.obter_recepcionista(db, recepcionista_id)
    servico.exigir_email_livre(db, dados.email, recepcionista.user_id)

    recepcionista.nome = dados.nome
    recepcionista.telefone = dados.telefone
    db.get(User, recepcionista.user_id).email = dados.email
    servico.flush_unico(db)

    auditoria.registrar(
        db, admin, "recepcionista.editar", "recepcionista", recepcionista.id, f"Recepcionista {recepcionista.nome} editado"
    )
    db.commit()

    return _linha_recepcionista(db, recepcionista_id)


@router.put("/admin/recepcionistas/{recepcionista_id}/status", response_model=RecepcionistaItem)
def alterar_status_recepcionista(
    recepcionista_id: int, dados: StatusAtualizar, admin=Depends(verificar_admin), db: Session = Depends(get_db),
):
    recepcionista = servico.obter_recepcionista(db, recepcionista_id)
    servico.alterar_status(db, admin, "recepcionista", recepcionista, dados.ativo)
    db.commit()

    return _linha_recepcionista(db, recepcionista_id)


@router.put("/admin/recepcionistas/{recepcionista_id}/permissoes", response_model=RecepcionistaItem)
def alterar_permissoes(
    recepcionista_id: int, dados: PermissoesAtualizar, admin=Depends(verificar_admin), db: Session = Depends(get_db),
):
    recepcionista = servico.obter_recepcionista(db, recepcionista_id)
    anteriores = list(recepcionista.permissoes or [])
    recepcionista.permissoes = servico.normalizar_permissoes(dados.permissoes)

    auditoria.registrar(
        db, admin, "recepcionista.permissoes", "recepcionista", recepcionista.id,
        f"Permissões de {recepcionista.nome} alteradas",
        {"anteriores": anteriores, "novas": recepcionista.permissoes},
    )
    db.commit()

    return _linha_recepcionista(db, recepcionista_id)
