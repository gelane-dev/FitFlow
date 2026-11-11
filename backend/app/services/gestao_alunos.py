"""Gestão de alunos (admin + recepção): listagem filtrada sem N+1, cadastro, edição, aprovação."""
from datetime import date

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..core.seguranca import criar_hash
from ..core.tempo import agora_naive, hoje
from ..models import Aluno, Professor, User
from . import auditoria
from .equipe import exigir_email_livre, flush_unico
from .fichas import transferir_fichas_do_aluno
from .matriculas import (
    alunos_inadimplentes, calcular_situacao, dias_alerta_vencimento, filtro_situacao,
    matriculas_ativas, resumo_matricula,
)
from .paginacao import ParametrosPagina, paginar


def obter_aluno(db: Session, aluno_id: int) -> Aluno:
    aluno = db.get(Aluno, aluno_id)
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    return aluno


def _item(aluno: Aluno, usuario: User, professor: Professor | None, ativa, inadimplentes: set, alerta: int) -> dict:
    referencia = hoje()
    matricula, plano = ativa if ativa else (None, None)
    return {
        "id": aluno.id, "nome": aluno.nome, "email": usuario.email, "telefone": aluno.telefone,
        "foto": usuario.foto, "ativo": usuario.ativo, "status_cadastro": aluno.status_cadastro,
        "professor": {"id": professor.id, "nome": professor.nome} if professor else None,
        "plano_atual": {"id": plano.id, "nome": plano.nome} if plano else None,
        "data_vencimento": matricula.data_vencimento if matricula else None,
        "situacao": calcular_situacao(matricula, referencia, alerta),
        "inadimplente": aluno.id in inadimplentes,
        "criado_em": usuario.criado_em,
    }


def listar(
    db: Session, parametros: ParametrosPagina, busca: str | None, situacao: str | None,
    professor_id: int | None, plano_id: int | None,
) -> tuple[list[dict], int]:
    from ..models import Matricula

    alerta = dias_alerta_vencimento(db)
    consulta = (
        select(Aluno, User, Professor)
        .join(User, User.id == Aluno.user_id)
        .outerjoin(Professor, Professor.id == Aluno.professor_id)
        .order_by(Aluno.nome, Aluno.id)
    )

    if busca and busca.strip():
        termo = f"%{busca.strip()}%"
        consulta = consulta.where(or_(
            Aluno.nome.ilike(termo), User.email.ilike(termo), Aluno.telefone.ilike(termo), Aluno.cpf.ilike(termo),
        ))
    if situacao:
        consulta = consulta.where(filtro_situacao(situacao, hoje(), alerta))
    if professor_id is not None:
        consulta = consulta.where(Aluno.professor_id.is_(None) if professor_id == 0 else Aluno.professor_id == professor_id)
    if plano_id is not None:
        consulta = consulta.where(
            select(Matricula.id).where(
                Matricula.aluno_id == Aluno.id, Matricula.status == "ativa", Matricula.plano_id == plano_id
            ).exists()
        )

    linhas, total = paginar(db, consulta, parametros)
    ids = [aluno.id for aluno, _, _ in linhas]
    ativas = matriculas_ativas(db, ids)
    inadimplentes = alunos_inadimplentes(db, ids)

    return [_item(a, u, p, ativas.get(a.id), inadimplentes, alerta) for a, u, p in linhas], total


def detalhe(db: Session, aluno: Aluno) -> dict:
    alerta = dias_alerta_vencimento(db)
    ativas = matriculas_ativas(db, [aluno.id])
    inadimplentes = alunos_inadimplentes(db, [aluno.id])
    professor = db.get(Professor, aluno.professor_id) if aluno.professor_id else None
    ativa = ativas.get(aluno.id)

    dados = _item(aluno, aluno.user, professor, ativa, inadimplentes, alerta)
    dados.update({
        "cpf": aluno.cpf, "endereco": aluno.endereco, "observacoes": aluno.observacoes,
        "data_nascimento": aluno.data_nascimento, "restricao_acesso": aluno.restricao_acesso,
        "codigo_acesso": aluno.codigo_acesso, "aprovado_em": aluno.aprovado_em,
        "matricula_atual": resumo_matricula(ativa[0], ativa[1], hoje(), alerta) if ativa else None,
    })
    return dados


def _exigir_cpf_livre(db: Session, cpf: str | None, ignorar_aluno_id: int | None = None) -> None:
    if not cpf:
        return
    existente = db.scalar(select(Aluno).where(Aluno.cpf == cpf))
    if existente and existente.id != ignorar_aluno_id:
        raise HTTPException(status_code=400, detail="CPF já cadastrado")


def _professor_ativo(db: Session, professor_id: int) -> Professor:
    professor = db.get(Professor, professor_id)
    if not professor:
        raise HTTPException(status_code=404, detail="Professor não encontrado")
    if not db.get(User, professor.user_id).ativo:
        raise HTTPException(status_code=422, detail="Professor inativo")
    return professor


def cadastrar(db: Session, ator: User, dados) -> Aluno:
    if dados.professor_id is not None and ator.tipo != "admin":
        raise HTTPException(status_code=403, detail="Permissão insuficiente")

    exigir_email_livre(db, dados.email)
    _exigir_cpf_livre(db, dados.cpf)
    professor = _professor_ativo(db, dados.professor_id) if dados.professor_id is not None else None

    agora = agora_naive()
    usuario = User(email=dados.email, senha=criar_hash(dados.senha), tipo="aluno", ativo=True, criado_em=agora)
    db.add(usuario)
    flush_unico(db)

    aluno = Aluno(
        user_id=usuario.id, nome=dados.nome, telefone=dados.telefone, data_nascimento=dados.data_nascimento,
        cpf=dados.cpf, endereco=dados.endereco, observacoes=dados.observacoes,
        status_cadastro="aprovado", aprovado_em=agora, aprovado_por_user_id=ator.id,
        professor_id=professor.id if professor else None,
        professor_vinculado_em=agora if professor else None,
    )
    db.add(aluno)
    flush_unico(db)

    auditoria.registrar(db, ator, "aluno.cadastrar", "aluno", aluno.id, f"Aluno {aluno.nome} cadastrado")
    return aluno


def editar(db: Session, ator: User, aluno: Aluno, dados) -> Aluno:
    _exigir_cpf_livre(db, dados.cpf, aluno.id)

    aluno.nome = dados.nome
    aluno.telefone = dados.telefone
    aluno.data_nascimento = dados.data_nascimento
    aluno.cpf = dados.cpf
    aluno.endereco = dados.endereco
    aluno.observacoes = dados.observacoes
    flush_unico(db)

    auditoria.registrar(db, ator, "aluno.editar", "aluno", aluno.id, f"Dados de {aluno.nome} editados")
    return aluno


def decidir_cadastro(db: Session, ator: User, aluno: Aluno, aprovar: bool) -> Aluno:
    if aluno.status_cadastro != "pendente":
        raise HTTPException(status_code=409, detail="Cadastro não está pendente")

    if aprovar:
        aluno.status_cadastro = "aprovado"
        aluno.aprovado_em = agora_naive()
        aluno.aprovado_por_user_id = ator.id
    else:
        aluno.status_cadastro = "recusado"

    acao = "aluno.aprovar" if aprovar else "aluno.recusar"
    auditoria.registrar(
        db, ator, acao, "aluno", aluno.id, f"Cadastro de {aluno.nome} {'aprovado' if aprovar else 'recusado'}"
    )
    return aluno


def alterar_status(db: Session, ator: User, aluno: Aluno, ativo: bool) -> Aluno:
    aluno.user.ativo = ativo
    auditoria.registrar(
        db, ator, "aluno.ativar" if ativo else "aluno.desativar", "aluno", aluno.id,
        f"Conta de {aluno.nome} {'ativada' if ativo else 'desativada'}",
    )
    return aluno


def trocar_professor(db: Session, ator: User, aluno: Aluno, professor_id: int | None) -> Aluno:
    anterior = aluno.professor_id
    fichas_transferidas: list[int] = []

    if professor_id is None:
        aluno.professor_id = None
        aluno.professor_vinculado_em = None
    else:
        professor = _professor_ativo(db, professor_id)
        aluno.professor_id = professor.id
        aluno.professor_vinculado_em = agora_naive()
        fichas_transferidas = transferir_fichas_do_aluno(db, [aluno.id], professor.id)  # ADR-038

    auditoria.registrar(
        db, ator, "aluno.trocar_professor", "aluno", aluno.id, f"Professor de {aluno.nome} alterado",
        {"professor_anterior_id": anterior, "professor_id": professor_id, "fichas_transferidas": fichas_transferidas},
    )
    return aluno


def alterar_restricao(db: Session, ator: User, aluno: Aluno, restricao: str | None) -> Aluno:
    aluno.restricao_acesso = restricao
    auditoria.registrar(
        db, ator, "aluno.restricao", "aluno", aluno.id,
        f"Restrição de acesso de {aluno.nome} {'definida' if restricao else 'removida'}",
        {"restricao_acesso": restricao},
    )
    return aluno
