from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from ..core.tempo import DataHoraLocal
from ..core.validacao import normalizar_cpf

Situacao = Literal["vigente", "vencendo", "vencida", "sem_matricula", "pendente", "desativado", "inadimplente"]


class ResumoNome(BaseModel):
    id: int
    nome: str


class MatriculaAtualResumo(BaseModel):
    id: int
    plano: ResumoNome
    data_inicio: date
    data_vencimento: date
    valor: Decimal
    situacao: str


class AlunoGestaoItem(BaseModel):
    id: int
    nome: str
    email: str
    telefone: str
    foto: str | None = None
    ativo: bool
    status_cadastro: str
    professor: ResumoNome | None = None
    plano_atual: ResumoNome | None = None
    data_vencimento: date | None = None
    situacao: str
    inadimplente: bool
    criado_em: DataHoraLocal | None = None


class AlunoGestaoDetalhe(AlunoGestaoItem):
    cpf: str | None = None
    endereco: str | None = None
    observacoes: str | None = None
    data_nascimento: date
    restricao_acesso: str | None = None
    codigo_acesso: str
    matricula_atual: MatriculaAtualResumo | None = None
    aprovado_em: DataHoraLocal | None = None


def _limpar(valor: str | None) -> str | None:
    if valor is None:
        return None
    valor = valor.strip()
    return valor or None


class AlunoGestaoCriar(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=6)
    nome: str = Field(min_length=1, max_length=150)
    telefone: str = Field(min_length=1, max_length=20)
    data_nascimento: date
    cpf: str | None = Field(default=None, max_length=18)
    endereco: str | None = Field(default=None, max_length=255)
    observacoes: str | None = Field(default=None, max_length=500)
    professor_id: int | None = None

    _limpar_textos = field_validator("endereco", "observacoes")(_limpar)
    _normalizar_cpf = field_validator("cpf")(normalizar_cpf)


class AlunoGestaoAtualizar(BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    telefone: str = Field(min_length=1, max_length=20)
    data_nascimento: date
    cpf: str | None = Field(default=None, max_length=18)
    endereco: str | None = Field(default=None, max_length=255)
    observacoes: str | None = Field(default=None, max_length=500)

    _limpar_textos = field_validator("endereco", "observacoes")(_limpar)
    _normalizar_cpf = field_validator("cpf")(normalizar_cpf)


class ProfessorDoAlunoAtualizar(BaseModel):
    professor_id: int | None = None


class RestricaoAtualizar(BaseModel):
    restricao_acesso: str | None = Field(default=None, max_length=255)

    _limpar_texto = field_validator("restricao_acesso")(_limpar)
