from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, Numeric, String, text
from sqlalchemy.orm import Mapped, mapped_column

from ..core.tempo import agora_naive
from .base import Base


class Matricula(Base):
    __tablename__ = "matriculas"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    aluno_id: Mapped[int] = mapped_column(ForeignKey("alunos.id"))
    plano_id: Mapped[int] = mapped_column(ForeignKey("planos.id"))
    data_inicio: Mapped[date] = mapped_column(Date)
    data_vencimento: Mapped[date] = mapped_column(Date)
    valor: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    status: Mapped[str] = mapped_column(String(20), default="ativa")
    motivo_cancelamento: Mapped[str | None] = mapped_column(String(300), nullable=True)
    cancelada_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    criado_por_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=agora_naive)
    matricula_anterior_id: Mapped[int | None] = mapped_column(ForeignKey("matriculas.id"), nullable=True)

    __table_args__ = (
        Index("ix_matriculas_aluno_status", "aluno_id", "status"),
        # no máximo uma matrícula ativa por aluno (mesma técnica de uq_sessoes_treino_aberta)
        Index(
            "uq_matriculas_ativa_por_aluno", "aluno_id", unique=True,
            sqlite_where=text("status = 'ativa'"),
            postgresql_where=text("status = 'ativa'"),
        ),
    )
