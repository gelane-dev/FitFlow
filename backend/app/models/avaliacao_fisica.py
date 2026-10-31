from datetime import datetime

from sqlalchemy import Integer, Float, String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

class AvaliacaoFisica(Base):
    __tablename__ = "avaliacoes_fisicas"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    aluno_id: Mapped[int] = mapped_column(ForeignKey("alunos.id"))
    aluno: Mapped["Aluno"] = relationship(back_populates="avaliacoes")
    data_avaliacao: Mapped[datetime] = mapped_column(DateTime)
    peso: Mapped[float] = mapped_column(Float)
    altura: Mapped[float] = mapped_column(Float)
    percentual_gordura: Mapped[float] = mapped_column(Float)
    massa_muscular: Mapped[float] = mapped_column(Float)
    observacao: Mapped[str] = mapped_column(String(500))
