from datetime import date, datetime

from sqlalchemy import String, Integer, ForeignKey, DateTime, Boolean, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

class Ficha(Base):
    __tablename__ = "fichas"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    aluno_id: Mapped[int] = mapped_column(ForeignKey("alunos.id"))
    aluno: Mapped["Aluno"] = relationship(back_populates="fichas")
    professor_id: Mapped[int] = mapped_column(ForeignKey("professores.id"))
    professor: Mapped["Professor"] = relationship(back_populates="fichas")
    nome: Mapped[str] = mapped_column(String(150))
    data_criacao: Mapped[datetime] = mapped_column(DateTime)
    data_inicio: Mapped[date | None] = mapped_column(Date, nullable=True)
    data_fim: Mapped[date | None] = mapped_column(Date, nullable=True)
    itens: Mapped[list["ItemFicha"]] = relationship(back_populates="ficha")
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    treinos: Mapped[list["Treino"]] = relationship(back_populates="ficha")
    objetivo: Mapped[str | None] = mapped_column(String(300), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="publicada", server_default="publicada")
    atualizado_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
