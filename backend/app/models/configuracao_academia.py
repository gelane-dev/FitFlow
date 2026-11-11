from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, false
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class ConfiguracaoAcademia(Base):
    """Linha única (id=1), criada pela migração."""
    __tablename__ = "configuracao_academia"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(150), default="FitFlow", server_default="FitFlow")
    endereco: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telefone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    horarios: Mapped[list] = mapped_column(JSON, default=list)
    tolerancia_dias_vencimento: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    bloquear_pagamento_pendente: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    dias_alerta_vencimento: Mapped[int] = mapped_column(Integer, default=7, server_default="7")
    dias_reavaliacao: Mapped[int] = mapped_column(Integer, default=90, server_default="90")
    dias_atualizar_treino: Mapped[int] = mapped_column(Integer, default=60, server_default="60")
    atualizado_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
