from datetime import date

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..core.tempo import agora
from ..models import Ficha, ItemFicha, Treino

MENSAGEM_DATA_FIM = "A data final deve ser posterior à data inicial"


def hoje() -> date:
    return agora().date()


def data_inicio_efetiva(ficha: Ficha) -> date:
    """Fichas antigas (sem data_inicio) usam a data de criação."""
    return ficha.data_inicio or ficha.data_criacao.date()


def esta_vigente(ficha: Ficha, dia: date | None = None) -> bool:
    dia = dia or hoje()
    if not ficha.ativo:
        return False
    if data_inicio_efetiva(ficha) > dia:
        return False
    return ficha.data_fim is None or ficha.data_fim >= dia


def validar_periodo(data_inicio: date, data_fim: date | None) -> None:
    if data_fim is not None and data_fim < data_inicio:
        raise HTTPException(status_code=400, detail=MENSAGEM_DATA_FIM)


def dados_vigencia(ficha: Ficha, dia: date | None = None) -> dict:
    """Campos de vigência comuns às respostas de ficha."""
    return {
        "data_inicio": data_inicio_efetiva(ficha),
        "data_fim": ficha.data_fim,
        "vigente": esta_vigente(ficha, dia),
    }


def contar_treinos_por_ficha(db: Session, ficha_ids: list[int]) -> dict[int, int]:
    """Treinos ativos de cada ficha, em uma única consulta agregada (sem N+1)."""
    if not ficha_ids:
        return {}
    linhas = db.execute(
        select(Treino.ficha_id, func.count(Treino.id))
        .where(Treino.ficha_id.in_(ficha_ids), Treino.ativo.is_(True))
        .group_by(Treino.ficha_id)
    ).all()
    return {ficha_id: total for ficha_id, total in linhas}


def contar_itens_por_treino(db: Session, treino_ids: list[int]) -> dict[int, int]:
    """Itens ativos de cada treino, em uma única consulta agregada (sem N+1)."""
    if not treino_ids:
        return {}
    linhas = db.execute(
        select(ItemFicha.treino_id, func.count(ItemFicha.id))
        .where(ItemFicha.treino_id.in_(treino_ids), ItemFicha.ativo.is_(True))
        .group_by(ItemFicha.treino_id)
    ).all()
    return {treino_id: total for treino_id, total in linhas}
