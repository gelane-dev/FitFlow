from datetime import datetime
from typing import Annotated
from zoneinfo import ZoneInfo

from pydantic import PlainSerializer

from .config import APP_TIMEZONE


def agora() -> datetime:
    """Data/hora atual (aware) no fuso da aplicação (APP_TIMEZONE)."""
    return datetime.now(ZoneInfo(APP_TIMEZONE))


def para_naive_local(momento: datetime) -> datetime:
    """Datetime com fuso vira horário local de APP_TIMEZONE sem tzinfo (as colunas DateTime são naive)."""
    if momento.tzinfo is None:
        return momento
    return momento.astimezone(ZoneInfo(APP_TIMEZONE)).replace(tzinfo=None)


def para_iso_com_fuso(momento: datetime) -> str:
    """Serializa o datetime em ISO 8601 com o offset de APP_TIMEZONE (ex.: 2026-10-31T10:00:00-03:00).

    Valores naive (como ficam no banco, ADR-016) são interpretados em APP_TIMEZONE;
    valores aware são convertidos para ele. O instante é o mesmo, sem ambiguidade.
    """
    fuso = ZoneInfo(APP_TIMEZONE)
    if momento.tzinfo is None:
        return momento.replace(tzinfo=fuso).isoformat()
    return momento.astimezone(fuso).isoformat()


# Tipo para campos datetime de resposta da API: serializa sempre com o offset de APP_TIMEZONE.
DataHoraLocal = Annotated[datetime, PlainSerializer(para_iso_com_fuso, return_type=str, when_used="json")]
