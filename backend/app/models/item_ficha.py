from sqlalchemy import Integer, Float, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

class ItemFicha(Base):
    __tablename__ = "itens_ficha"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ficha_id: Mapped[int] = mapped_column(ForeignKey("fichas.id"))
    ficha: Mapped["Ficha"] = relationship(back_populates="itens")
    exercicio_id: Mapped[int] = mapped_column(ForeignKey("exercicios.id"))
    exercicio: Mapped["Exercicio"] = relationship(back_populates="itens")
    series: Mapped[int] = mapped_column(Integer)
    repeticoes: Mapped[int] = mapped_column(Integer)
    carga: Mapped[float] = mapped_column(Float)
    descanso: Mapped[int] = mapped_column(Integer)
    historicos: Mapped[list["HistoricoExecucao"]] = relationship(back_populates="item_ficha")
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    treino_id: Mapped[int] = mapped_column(ForeignKey("treino.id"))
    treino: Mapped["Treino"] = relationship(back_populates="itens")
    ordem: Mapped[int] = mapped_column(Integer)