import re
from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..core.tempo import DataHoraLocal
from ..enums.dia_semana import DiaSemana

_HORA = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


class HorarioFuncionamento(BaseModel):
    dia: DiaSemana
    abre: str
    fecha: str
    fechado: bool = False

    @field_validator("abre", "fecha")
    @classmethod
    def validar_hora(cls, valor: str) -> str:
        if not _HORA.match(valor):
            raise ValueError("Horário deve estar no formato HH:MM")
        return valor


class ConfiguracaoPublicaResposta(BaseModel):
    nome: str
    endereco: str | None = None
    telefone: str | None = None
    email: str | None = None
    horarios: list[HorarioFuncionamento] = []

    model_config = ConfigDict(from_attributes=True)


class ConfiguracaoResposta(ConfiguracaoPublicaResposta):
    tolerancia_dias_vencimento: int
    bloquear_pagamento_pendente: bool
    dias_alerta_vencimento: int
    dias_reavaliacao: int
    dias_atualizar_treino: int
    atualizado_em: DataHoraLocal | None = None


class ConfiguracaoAtualizar(BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    endereco: str | None = Field(default=None, max_length=255)
    telefone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=150)
    horarios: list[HorarioFuncionamento] = []
    tolerancia_dias_vencimento: int = Field(default=0, ge=0)
    bloquear_pagamento_pendente: bool = False
    dias_alerta_vencimento: int = Field(default=7, ge=0)
    dias_reavaliacao: int = Field(default=90, ge=0)
    dias_atualizar_treino: int = Field(default=60, ge=0)
