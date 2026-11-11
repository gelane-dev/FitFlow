"""Professores e recepcionistas (admin): permissões, nomes de usuários, criação e edição."""
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..core.seguranca import criar_hash
from ..core.tempo import agora_naive
from ..models import Aluno, Professor, Recepcionista, User
from . import auditoria

PERMISSOES_RECEPCAO = (
    "cadastrar_aluno", "editar_aluno", "aprovar_aluno", "matricular", "renovar_matricula",
    "alterar_plano", "cancelar_matricula", "registrar_pagamento", "estornar_pagamento",
    "registrar_acesso", "liberar_acesso_manual",
)

PERMISSOES_PADRAO = (
    "cadastrar_aluno", "editar_aluno", "aprovar_aluno", "matricular", "renovar_matricula",
    "registrar_pagamento", "registrar_acesso",
)


def usuario_tem_permissao(db: Session, usuario: User, nome: str) -> bool:
    """Admin sempre tem; recepção só com a permissão; demais perfis não."""
    if usuario.tipo == "admin":
        return True
    if usuario.tipo != "recepcao":
        return False
    recepcionista = db.scalar(select(Recepcionista).where(Recepcionista.user_id == usuario.id))
    return bool(recepcionista and nome in (recepcionista.permissoes or []))


def nomes_usuarios(db: Session, user_ids: set[int]) -> dict[int, str]:
    """Nome de exibição por user_id (professor, recepção ou aluno); admin cai no e-mail. Três consultas fixas."""
    if not user_ids:
        return {}
    nomes = {u.id: u.email for u in db.scalars(select(User).where(User.id.in_(user_ids))).all()}
    for modelo in (Professor, Recepcionista, Aluno):
        for user_id, nome in db.execute(select(modelo.user_id, modelo.nome).where(modelo.user_id.in_(user_ids))).all():
            nomes[user_id] = nome
    return nomes


def normalizar_permissoes(permissoes: list[str] | None) -> list[str]:
    if permissoes is None:
        return list(PERMISSOES_PADRAO)
    return [p for p in PERMISSOES_RECEPCAO if p in set(permissoes)]


def flush_unico(db: Session) -> None:
    """flush traduzindo violação de unicidade (corrida entre a checagem e o insert) em 400 do contrato."""
    try:
        db.flush()
    except IntegrityError as erro:
        db.rollback()
        texto = str(erro.orig).lower()
        if "cpf" in texto:
            raise HTTPException(status_code=400, detail="CPF já cadastrado")
        if "email" in texto:
            raise HTTPException(status_code=400, detail="E-mail já cadastrado")
        raise


def exigir_email_livre(db: Session, email: str, ignorar_user_id: int | None = None) -> None:
    existente = db.scalar(select(User).where(User.email == email))
    if existente and existente.id != ignorar_user_id:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")


def obter_professor(db: Session, professor_id: int) -> Professor:
    professor = db.get(Professor, professor_id)
    if not professor:
        raise HTTPException(status_code=404, detail="Professor não encontrado")
    return professor


def obter_recepcionista(db: Session, recepcionista_id: int) -> Recepcionista:
    recepcionista = db.get(Recepcionista, recepcionista_id)
    if not recepcionista:
        raise HTTPException(status_code=404, detail="Recepcionista não encontrado")
    return recepcionista


def criar_recepcionista(db: Session, admin: User, dados) -> Recepcionista:
    exigir_email_livre(db, dados.email)

    usuario = User(
        email=dados.email, senha=criar_hash(dados.senha), tipo="recepcao", ativo=True, criado_em=agora_naive()
    )
    db.add(usuario)
    flush_unico(db)

    recepcionista = Recepcionista(
        user_id=usuario.id, nome=dados.nome, telefone=dados.telefone,
        permissoes=normalizar_permissoes(dados.permissoes),
    )
    db.add(recepcionista)
    db.flush()

    auditoria.registrar(
        db, admin, "recepcionista.criar", "recepcionista", recepcionista.id,
        f"Recepcionista {recepcionista.nome} criado", {"permissoes": recepcionista.permissoes},
    )
    return recepcionista


def alterar_status(db: Session, admin: User, entidade: str, perfil, ativo: bool) -> None:
    """Ativa/desativa a conta de um professor ou recepcionista (`perfil` tem `user_id` e `nome`)."""
    usuario = db.get(User, perfil.user_id)
    usuario.ativo = ativo
    auditoria.registrar(
        db, admin, f"{entidade}.{'ativar' if ativo else 'desativar'}", entidade, perfil.id,
        f"{'Ativação' if ativo else 'Desativação'} de {perfil.nome}",
    )
