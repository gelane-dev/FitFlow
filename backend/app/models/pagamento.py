from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from ..core.tempo import agora_naive
from .base import Base


class Pagamento(Base):
    __tablename__ = "pagamentos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    aluno_id: Mapped[int] = mapped_column(ForeignKey("alunos.id"), index=True)
    matricula_id: Mapped[int | None] = mapped_column(ForeignKey("matriculas.id"), nullable=True)
    descricao: Mapped[str] = mapped_column(String(150))
    valor: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    vencimento: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="pendente")
    forma: Mapped[str | None] = mapped_column(String(20), nullable=True)
    valor_recebido: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    pago_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    registrado_por_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    motivo_estorno: Mapped[str | None] = mapped_column(String(300), nullable=True)
    estornado_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    estornado_por_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=agora_naive)

    __table_args__ = (Index("ix_pagamentos_status_vencimento", "status", "vencimento"),)
