from datetime import date

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


class PontoEvolucao(BaseModel):
    data: date
    carga_maxima: float
    volume: float
    registros: int


class EvolucaoExercicio(BaseModel):
    exercicio_id: int
    nome: str
    pontos: list[PontoEvolucao]
