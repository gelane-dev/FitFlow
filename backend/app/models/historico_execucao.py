from datetime import datetime

from sqlalchemy import Integer, Float, String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

class HistoricoExecucao(Base):
    __tablename__ = "historicos_execucao"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_ficha_id: Mapped[int] = mapped_column(ForeignKey("itens_ficha.id"))
    item_ficha: Mapped["ItemFicha"] = relationship(back_populates="historicos")
    aluno_id: Mapped[int] = mapped_column(ForeignKey("alunos.id"))
    aluno: Mapped["Aluno"] = relationship(back_populates="historicos")
    data_execucao: Mapped[datetime] = mapped_column(DateTime)
    series_realizadas: Mapped[int] = mapped_column(Integer)
    repeticoes_realizadas: Mapped[int] = mapped_column(Integer)
    carga_utilizada: Mapped[float] = mapped_column(Float)
    observacao: Mapped[str | None] = mapped_column(String(500), nullable=True)
