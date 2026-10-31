from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from ..core.tempo import DataHoraLocal, para_naive_local


class AvaliacaoCriar(BaseModel):
    data_avaliacao: DataHoraLocal
    peso: float = Field(gt=0)
    altura: float = Field(ge=0.5, le=2.5)
    percentual_gordura: float | None = Field(default=None, ge=0, le=100)
    massa_muscular: float | None = Field(default=None, gt=0)
    observacao: str | None = Field(default=None, max_length=500)

    @field_validator("data_avaliacao")
    @classmethod
    def normalizar_fuso(cls, valor: datetime) -> datetime:
        return para_naive_local(valor)


class AvaliacaoResposta(AvaliacaoCriar):
    id: int
    aluno_id: int
    professor_id: int | None
    imc: float
