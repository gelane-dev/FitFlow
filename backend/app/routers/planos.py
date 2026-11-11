from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..core.seguranca import exigir_papeis, verificar_admin
from ..core.tempo import hoje
from ..database import get_db
from ..models import Aluno, Matricula, Plano, User
from ..schemas.plano import AlunoDoPlano, PlanoAtualizar, PlanoCriar, PlanoResposta, StatusAtualizar
from ..services import auditoria
from ..services.matriculas import calcular_situacao, dias_alerta_vencimento

router = APIRouter()


def _consulta_planos():
    total = (
        select(func.count(Matricula.id)).where(Matricula.plano_id == Plano.id, Matricula.status == "ativa")
        .correlate(Plano).scalar_subquery()
    )
    return select(Plano, total)


def _resposta(plano: Plano, total: int) -> dict:
    return {
        "id": plano.id, "nome": plano.nome, "descricao": plano.descricao, "duracao_dias": plano.duracao_dias,
        "valor": plano.valor, "periodicidade": plano.periodicidade,
        "renovacao_automatica": plano.renovacao_automatica, "condicoes": plano.condicoes,
        "ativo": plano.ativo, "criado_em": plano.criado_em, "total_alunos": total,
    }


def _obter(db: Session, plano_id: int) -> Plano:
    plano = db.get(Plano, plano_id)
    if not plano:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    return plano


def _responder(db: Session, plano_id: int) -> dict:
    return _resposta(*db.execute(_consulta_planos().where(Plano.id == plano_id)).one())


@router.get("/planos", response_model=list[PlanoResposta])
def listar_planos(
    ativo: bool | None = None,
    usuario: User = Depends(exigir_papeis("admin", "recepcao")),
    db: Session = Depends(get_db),
):
    consulta = _consulta_planos().order_by(Plano.nome, Plano.id)

    if usuario.tipo == "recepcao":
        consulta = consulta.where(Plano.ativo.is_(True))
    elif ativo is not None:
        consulta = consulta.where(Plano.ativo.is_(ativo))

    return [_resposta(*linha) for linha in db.execute(consulta).all()]


@router.post("/admin/planos", response_model=PlanoResposta)
def criar_plano(dados: PlanoCriar, admin=Depends(verificar_admin), db: Session = Depends(get_db)):

    plano = Plano(**dados.model_dump())
    db.add(plano)
    db.flush()

    auditoria.registrar(
        db, admin, "plano.criar", "plano", plano.id, f"Plano {plano.nome} criado", {"valor": str(plano.valor)}
    )
    db.commit()

    return _responder(db, plano.id)


@router.put("/admin/planos/{plano_id}", response_model=PlanoResposta)
def editar_plano(plano_id: int, dados: PlanoAtualizar, admin=Depends(verificar_admin), db: Session = Depends(get_db)):

    plano = _obter(db, plano_id)
    valor_anterior = plano.valor

    for campo, valor in dados.model_dump().items():
        setattr(plano, campo, valor)

    auditoria.registrar(
        db, admin, "plano.editar", "plano", plano.id, f"Plano {plano.nome} editado",
        {"valor_anterior": str(valor_anterior), "valor": str(plano.valor)},
    )
    db.commit()

    return _responder(db, plano.id)


@router.put("/admin/planos/{plano_id}/status", response_model=PlanoResposta)
def alterar_status_plano(
    plano_id: int, dados: StatusAtualizar, admin=Depends(verificar_admin), db: Session = Depends(get_db),
):
    plano = _obter(db, plano_id)
    plano.ativo = dados.ativo

    auditoria.registrar(
        db, admin, "plano.ativar" if dados.ativo else "plano.desativar", "plano", plano.id,
        f"Plano {plano.nome} {'ativado' if dados.ativo else 'desativado'}",
    )
    db.commit()

    return _responder(db, plano.id)


@router.get("/admin/planos/{plano_id}/alunos", response_model=list[AlunoDoPlano])
def alunos_do_plano(plano_id: int, admin=Depends(verificar_admin), db: Session = Depends(get_db)):

    _obter(db, plano_id)
    alerta = dias_alerta_vencimento(db)
    linhas = db.execute(
        select(Aluno, User, Matricula)
        .join(User, User.id == Aluno.user_id).join(Matricula, Matricula.aluno_id == Aluno.id)
        .where(Matricula.plano_id == plano_id, Matricula.status == "ativa").order_by(Aluno.nome)
    ).all()

    return [{
        "id": a.id, "nome": a.nome, "email": u.email, "telefone": a.telefone,
        "data_inicio": m.data_inicio, "data_vencimento": m.data_vencimento,
        "situacao": calcular_situacao(m, hoje(), alerta),
    } for a, u, m in linhas]
