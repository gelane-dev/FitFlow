from datetime import date

from sqlalchemy import String, Integer, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

class Aluno(Base):
    __tablename__ = "alunos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    user: Mapped["User"] = relationship(back_populates="aluno")
    fichas: Mapped[list["Ficha"]] = relationship(back_populates="aluno")
    nome: Mapped[str] = mapped_column(String(150))
    data_nascimento: Mapped[date] = mapped_column(Date)
    telefone: Mapped[str] = mapped_column(String(20))
    historicos: Mapped[list["HistoricoExecucao"]] = relationship(back_populates="aluno")
    avaliacoes: Mapped[list["AvaliacaoFisica"]] = relationship(back_populates="aluno")
