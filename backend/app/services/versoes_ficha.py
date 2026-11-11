from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..core.tempo import agora_naive
from ..models import Ficha, FichaVersao, Professor, User
from ..schemas.professor_web import AutorVersao, FichaVersaoResposta, FichaVersaoResumo
from . import auditoria
from .fichas import montar_ficha_completa, usuario_do_ator


def publicar(db: Session, ator: tuple, ficha: Ficha) -> FichaVersao:
    """Marca a ficha como publicada e congela o estado atual numa nova versão (sem commit)."""
    ficha.status = "publicada"
    ficha.atualizado_em = agora_naive()
    db.flush()

    # Trava a ficha: duas publicações simultâneas não geram o mesmo número de versão
    db.execute(select(Ficha.id).where(Ficha.id == ficha.id).with_for_update())
    ultimo = db.scalar(select(func.max(FichaVersao.numero)).where(FichaVersao.ficha_id == ficha.id)) or 0
    usuario = usuario_do_ator(ator)
    conteudo = montar_ficha_completa(db, ficha).model_dump(mode="json")

    versao = FichaVersao(
        ficha_id=ficha.id, numero=ultimo + 1, publicada_em=agora_naive(),
        publicada_por_user_id=usuario.id, conteudo=conteudo,
    )
    db.add(versao)
    db.flush()

    auditoria.registrar(
        db, usuario, "ficha.publicar", "ficha", ficha.id,
        f"Ficha \"{ficha.nome}\" publicada (versão {versao.numero})",
        {"ficha_id": ficha.id, "versao": versao.numero, "ator": ator[0]},
    )
    return versao


def _autores(db: Session, user_ids: set[int]) -> dict[int, AutorVersao]:
    """Autores das versões em lote: nome do professor (ou e-mail) e tipo do usuário, em duas consultas."""
    if not user_ids:
        return {}
    usuarios = {u.id: u for u in db.scalars(select(User).where(User.id.in_(user_ids))).all()}
    nomes_professor = dict(db.execute(
        select(Professor.user_id, Professor.nome).where(Professor.user_id.in_(user_ids))).all())
    return {
        user_id: AutorVersao(
            id=user_id,
            nome=nomes_professor.get(user_id, usuarios[user_id].email) if user_id in usuarios else None,
            tipo=usuarios[user_id].tipo if user_id in usuarios else "desconhecido",
        )
        for user_id in user_ids
    }


def _resumo(versao: FichaVersao, autores: dict[int, AutorVersao]) -> FichaVersaoResumo:
    return FichaVersaoResumo(
        numero=versao.numero, publicada_em=versao.publicada_em, publicada_por=autores[versao.publicada_por_user_id])


def montar_resumo(db: Session, versao: FichaVersao) -> FichaVersaoResumo:
    return _resumo(versao, _autores(db, {versao.publicada_por_user_id}))


def listar(db: Session, ficha: Ficha) -> list[FichaVersaoResumo]:
    versoes = db.scalars(
        select(FichaVersao).where(FichaVersao.ficha_id == ficha.id).order_by(FichaVersao.numero.desc())).all()
    autores = _autores(db, {versao.publicada_por_user_id for versao in versoes})
    return [_resumo(versao, autores) for versao in versoes]


def obter(db: Session, ficha: Ficha, numero: int) -> FichaVersaoResposta:
    versao = db.scalar(
        select(FichaVersao).where(FichaVersao.ficha_id == ficha.id, FichaVersao.numero == numero))
    if not versao:
        raise HTTPException(status_code=404, detail="Versão não encontrada")
    return FichaVersaoResposta(**montar_resumo(db, versao).model_dump(), conteudo=versao.conteudo)
