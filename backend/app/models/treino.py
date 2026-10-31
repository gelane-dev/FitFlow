from sqlalchemy import String, Integer, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

class Treino(Base):
    __tablename__ = "treino"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ficha_id: Mapped[int] = mapped_column(ForeignKey("fichas.id"))
    nome: Mapped[str] = mapped_column(String(150))
    dia_semana: Mapped[str] = mapped_column(String(20))
    ordem: Mapped[int] = mapped_column(Integer)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    ficha: Mapped["Ficha"] = relationship(back_populates="treinos")
    itens: Mapped[list["ItemFicha"]] = relationship(back_populates="treino")
   