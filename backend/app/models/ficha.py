from datetime import datetime

from sqlalchemy import String, Integer, ForeignKey, DateTime, Boolean
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
    itens: Mapped[list["ItemFicha"]] = relationship(back_populates="ficha")
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    treinos: Mapped[list["Treino"]] = relationship(back_populates="ficha")