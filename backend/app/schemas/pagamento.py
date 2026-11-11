from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from ..core.tempo import DataHoraLocal, agora_naive, para_naive_local
from .gestao import ResumoNome

FormaPagamento = Literal["dinheiro", "pix", "cartao_credito", "cartao_debito", "transferencia", "outro"]


class PagamentoRegistrar(BaseModel):
    forma: FormaPagamento
    valor_recebido: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    pago_em: datetime | None = None

    @field_validator("pago_em")
    @classmethod
    def pago_em_nao_futuro(cls, valor: datetime | None) -> datetime | None:
        # 5 minutos de folga para diferença de relógio entre o app e o servidor
        if valor is not None and para_naive_local(valor) > agora_naive() + timedelta(minutes=5):
            raise ValueError("Data do pagamento não pode ser futura")
        return valor


class PagamentoAvulso(BaseModel):
    aluno_id: int
    descricao: str = Field(min_length=1, max_length=150)
    valor: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    forma: FormaPagamento

    @field_validator("descricao")
    @classmethod
    def descricao_preenchida(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("Descrição é obrigatória")
        return valor


class PagamentoEstornar(BaseModel):
    motivo: str = Field(min_length=1, max_length=300)

    @field_validator("motivo")
    @classmethod
    def motivo_preenchido(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("Motivo é obrigatório")
        return valor


class PagamentoResposta(BaseModel):
    id: int
    aluno: ResumoNome
    matricula_id: int | None = None
    descricao: str
    valor: Decimal
    vencimento: date
    status: str
    vencido: bool
    forma: str | None = None
    valor_recebido: Decimal | None = None
    pago_em: DataHoraLocal | None = None
    registrado_por_user_id: int | None = None
    motivo_estorno: str | None = None
    estornado_em: DataHoraLocal | None = None
    criado_em: DataHoraLocal


class AcademiaComprovante(BaseModel):
    nome: str
    endereco: str | None = None
    telefone: str | None = None


class ComprovanteResposta(BaseModel):
    numero: str
    status: str
    aluno: ResumoNome
    descricao: str
    valor: Decimal
    valor_recebido: Decimal | None = None
    forma: str | None = None
    pago_em: DataHoraLocal | None = None
    registrado_por: str | None = None
    academia: AcademiaComprovante
