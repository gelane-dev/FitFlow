from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Integer, Numeric, String, false, true
from sqlalchemy.orm import Mapped, mapped_column

from ..core.tempo import agora_naive
from .base import Base


class Plano(Base):
    __tablename__ = "planos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(100))
    descricao: Mapped[str | None] = mapped_column(String(500), nullable=True)
    duracao_dias: Mapped[int] = mapped_column(Integer)
    valor: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    periodicidade: Mapped[str] = mapped_column(String(20))
    renovacao_automatica: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    condicoes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=agora_naive)
