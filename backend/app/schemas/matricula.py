from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from ..core.tempo import DataHoraLocal
from .gestao import ResumoNome


class MatriculaCriar(BaseModel):
    aluno_id: int
    plano_id: int
    data_inicio: date | None = None


class MatriculaRenovar(BaseModel):
    plano_id: int | None = None


class MatriculaAlterarPlano(BaseModel):
    plano_id: int


class MatriculaCancelar(BaseModel):
    motivo: str = Field(min_length=1, max_length=300)

    @field_validator("motivo")
    @classmethod
    def motivo_preenchido(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("Motivo é obrigatório")
        return valor


class MatriculaResposta(BaseModel):
    id: int
    aluno: ResumoNome
    plano: ResumoNome
    data_inicio: date
    data_vencimento: date
    valor: Decimal
    status: str
    situacao: str | None = None
    motivo_cancelamento: str | None = None
    cancelada_em: DataHoraLocal | None = None
    matricula_anterior_id: int | None = None
    criado_em: DataHoraLocal
