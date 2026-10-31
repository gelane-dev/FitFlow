from pydantic import BaseModel, Field

from ..core.tempo import DataHoraLocal
from .ficha import HistoricoResposta


class SessaoCriar(BaseModel):
    treino_id: int


class ExecucaoCriar(BaseModel):
    item_ficha_id: int
    series_realizadas: int = Field(ge=1)
    repeticoes_realizadas: int = Field(ge=0)
    carga_utilizada: float = Field(ge=0)
    observacao: str | None = Field(default=None, max_length=500)


class ExecucoesCriar(BaseModel):
    execucoes: list[ExecucaoCriar] = Field(min_length=1, max_length=50)


class SessaoFinalizar(BaseModel):
    esforco: int | None = Field(default=None, ge=1, le=10)
    comentario: str | None = Field(default=None, max_length=500)


class SessaoResumo(BaseModel):
    id: int
    treino_id: int
    treino_nome: str
    ficha_id: int
    iniciada_em: DataHoraLocal
    finalizada_em: DataHoraLocal | None
    esforco: int | None
    comentario: str | None
    total_execucoes: int
    total_series: int = 0
    volume_total: float = 0.0
    duracao_segundos: int | None = None


class SessaoResposta(SessaoResumo):
    execucoes: list[HistoricoResposta]
