from datetime import date, datetime, time, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..core.tempo import agora_naive
from ..models import Aluno, Auditoria, Professor, Recepcionista, User


def registrar(
    db: Session,
    usuario: User | None,
    acao: str,
    entidade: str,
    entidade_id: int | None = None,
    descricao: str = "",
    detalhes: dict | None = None,
) -> Auditoria:
    """Adiciona o registro de auditoria à sessão, SEM commit: grava na mesma transação da operação (ADR-036)."""

    registro = Auditoria(
        user_id=usuario.id if usuario else None,
        data_hora=agora_naive(),
        acao=acao,
        entidade=entidade,
        entidade_id=entidade_id,
        descricao=descricao[:300],
        detalhes=detalhes,
    )

    db.add(registro)

    return registro


def consulta_auditoria(
    user_id: int | None = None, acao: str | None = None, entidade: str | None = None,
    entidade_id: int | None = None, inicio: date | None = None, fim: date | None = None,
    tipos_usuario: tuple[str, ...] | None = None, prefixos_acao: tuple[str, ...] | None = None,
):
    """Select (Auditoria, tipo, nome) com o usuário resolvido por joins (sem N+1), mais recentes primeiro."""
    nome = func.coalesce(Professor.nome, Recepcionista.nome, Aluno.nome, User.email)

    consulta = (
        select(Auditoria, User.tipo, nome)
        .outerjoin(User, User.id == Auditoria.user_id)
        .outerjoin(Professor, Professor.user_id == User.id)
        .outerjoin(Recepcionista, Recepcionista.user_id == User.id)
        .outerjoin(Aluno, Aluno.user_id == User.id)
        .order_by(Auditoria.data_hora.desc(), Auditoria.id.desc())
    )

    if user_id is not None:
        consulta = consulta.where(Auditoria.user_id == user_id)
    if acao:
        consulta = consulta.where(Auditoria.acao == acao)
    if entidade:
        consulta = consulta.where(Auditoria.entidade == entidade)
    if entidade_id is not None:
        consulta = consulta.where(Auditoria.entidade_id == entidade_id)
    if inicio:
        consulta = consulta.where(Auditoria.data_hora >= datetime.combine(inicio, time.min))
    if fim:
        consulta = consulta.where(Auditoria.data_hora < datetime.combine(fim + timedelta(days=1), time.min))
    if tipos_usuario:
        consulta = consulta.where(User.tipo.in_(tipos_usuario))
    if prefixos_acao:
        consulta = consulta.where(or_(*[Auditoria.acao.startswith(p) for p in prefixos_acao]))

    return consulta


def para_item(linha) -> dict:
    """Linha de `consulta_auditoria` → dicionário de AuditoriaItem."""
    registro, tipo, nome = linha
    return {
        "id": registro.id, "data_hora": registro.data_hora, "acao": registro.acao,
        "entidade": registro.entidade, "entidade_id": registro.entidade_id,
        "descricao": registro.descricao, "detalhes": registro.detalhes,
        "usuario": {"id": registro.user_id, "nome": nome, "tipo": tipo} if registro.user_id and tipo else None,
    }


def atividade_do_usuario(db: Session, user_id: int, limite: int = 20) -> list[dict]:
    return [para_item(linha) for linha in db.execute(consulta_auditoria(user_id=user_id).limit(limite)).all()]
