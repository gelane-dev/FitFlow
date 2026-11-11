import secrets
from datetime import date, datetime

from sqlalchemy import String, Integer, ForeignKey, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

def gerar_codigo_acesso() -> str:
    return secrets.token_hex(8)


class Aluno(Base):
    __tablename__ = "alunos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    user: Mapped["User"] = relationship(back_populates="aluno", foreign_keys=[user_id])
    fichas: Mapped[list["Ficha"]] = relationship(back_populates="aluno")
    nome: Mapped[str] = mapped_column(String(150))
    data_nascimento: Mapped[date] = mapped_column(Date)
    telefone: Mapped[str] = mapped_column(String(20))
    historicos: Mapped[list["HistoricoExecucao"]] = relationship(back_populates="aluno")
    avaliacoes: Mapped[list["AvaliacaoFisica"]] = relationship(back_populates="aluno")
    status_cadastro: Mapped[str] = mapped_column(String(20), default="aprovado", server_default="aprovado")
    professor_id: Mapped[int | None] = mapped_column(ForeignKey("professores.id"), nullable=True, index=True)
    professor_vinculado_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cpf: Mapped[str | None] = mapped_column(String(14), nullable=True, unique=True)
    endereco: Mapped[str | None] = mapped_column(String(255), nullable=True)
    observacoes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    restricao_acesso: Mapped[str | None] = mapped_column(String(255), nullable=True)
    codigo_acesso: Mapped[str] = mapped_column(String(32), unique=True, default=gerar_codigo_acesso)
    aprovado_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    aprovado_por_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
