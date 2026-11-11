from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel

from ..core.tempo import DataHoraLocal


class AcessoCriar(BaseModel):
    aluno_id: int | None = None
    codigo: str | None = None
    origem: Literal["manual", "qrcode", "codigo_barras"] = "manual"
    forcar: bool = False


class MotivoAcesso(BaseModel):
    codigo: str
    mensagem: str


class AlunoAcesso(BaseModel):
    id: int
    nome: str
    foto: str | None = None
    status_cadastro: str
    ativo: bool


class MatriculaAcesso(BaseModel):
    plano: str
    data_vencimento: date
    situacao: str


class PendenciasAcesso(BaseModel):
    quantidade: int
    valor_total: Decimal


class EntradaResumo(BaseModel):
    id: int
    data_hora: DataHoraLocal
    resultado: str
    liberacao_manual: bool


class VerificacaoAcessoResposta(BaseModel):
    aluno: AlunoAcesso
    autorizado: bool
    motivos: list[MotivoAcesso]
    matricula: MatriculaAcesso | None = None
    pendencias: PendenciasAcesso
    ultimas_entradas: list[EntradaResumo]


class AlunoAcessoResumo(BaseModel):
    id: int
    nome: str
    foto: str | None = None


class AcessoResposta(BaseModel):
    id: int
    aluno: AlunoAcessoResumo
    data_hora: DataHoraLocal
    resultado: str
    motivos: list[MotivoAcesso]
    origem: str
    liberacao_manual: bool
    registrado_por: str | None = None
