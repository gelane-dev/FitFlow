from datetime import date
from typing import Literal

from pydantic import BaseModel

from ..core.tempo import DataHoraLocal


class EvolucaoExercicioResumo(BaseModel):
    exercicio_id: int
    nome: str
    grupo_muscular: str
    total_registros: int
    ultima_carga: float
    carga_maxima: float
    ultima_data: DataHoraLocal


PeriodoEvolucao = Literal["7d", "30d", "3m", "6m", "1a"]


class PontoEvolucao(BaseModel):
    data: date
    carga_maxima: float
    volume: float
    registros: int
    repeticoes_maximas: int
    series: int


class ComparacaoEvolucao(BaseModel):
    atual: PontoEvolucao
    anterior: PontoEvolucao | None = None


class EvolucaoExercicio(BaseModel):
    exercicio_id: int
    nome: str
    periodo: PeriodoEvolucao | None = None
    pontos: list[PontoEvolucao]
    comparacao: ComparacaoEvolucao
