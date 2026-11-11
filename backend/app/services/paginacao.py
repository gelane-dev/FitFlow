from typing import Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

T = TypeVar("T")

POR_PAGINA_PADRAO = 20
POR_PAGINA_MAXIMO = 100


class Pagina(BaseModel, Generic[T]):
    itens: list[T]
    total: int
    pagina: int
    por_pagina: int


class ParametrosPagina:
    def __init__(
        self,
        pagina: int = Query(1, ge=1),
        por_pagina: int = Query(POR_PAGINA_PADRAO, ge=1, le=POR_PAGINA_MAXIMO),
    ):
        self.pagina = pagina
        self.por_pagina = por_pagina

    @property
    def deslocamento(self) -> int:
        return (self.pagina - 1) * self.por_pagina


def contar(db: Session, consulta) -> int:
    """Total de linhas da consulta (sem ordenação/limite)."""
    return db.scalar(select(func.count()).select_from(consulta.order_by(None).subquery())) or 0


def paginar(db: Session, consulta, parametros: ParametrosPagina) -> tuple[list, int]:
    """Executa a consulta (já ordenada) numa página e devolve (linhas, total)."""
    total = contar(db, consulta)
    linhas = db.execute(consulta.limit(parametros.por_pagina).offset(parametros.deslocamento)).all()
    return linhas, total


def montar_pagina(itens: list, total: int, parametros: ParametrosPagina) -> dict:
    return {"itens": itens, "total": total, "pagina": parametros.pagina, "por_pagina": parametros.por_pagina}
