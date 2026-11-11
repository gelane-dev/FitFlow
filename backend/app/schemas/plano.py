from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..core.tempo import DataHoraLocal

Periodicidade = Literal["mensal", "trimestral", "semestral", "anual", "avulso"]


class PlanoCriar(BaseModel):
    nome: str = Field(min_length=1, max_length=100)
    descricao: str | None = Field(default=None, max_length=500)
    duracao_dias: int = Field(gt=0)
    valor: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    periodicidade: Periodicidade
    renovacao_automatica: bool = False
    condicoes: str | None = Field(default=None, max_length=500)

    @field_validator("nome")
    @classmethod
    def nome_sem_espacos(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("Nome é obrigatório")
        return valor


class PlanoAtualizar(PlanoCriar):
    pass


class StatusAtualizar(BaseModel):
    ativo: bool


class PlanoResposta(BaseModel):
    id: int
    nome: str
    descricao: str | None = None
    duracao_dias: int
    valor: Decimal
    periodicidade: str
    renovacao_automatica: bool
    condicoes: str | None = None
    ativo: bool
    criado_em: DataHoraLocal
    total_alunos: int = 0

    model_config = ConfigDict(from_attributes=True)


class AlunoDoPlano(BaseModel):
    id: int
    nome: str
    email: str
    telefone: str
    data_inicio: date
    data_vencimento: date
    situacao: str
