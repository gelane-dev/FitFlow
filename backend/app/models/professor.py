from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

class Professor(Base):
    __tablename__ = "professores"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    user: Mapped["User"] = relationship(back_populates="professor")
    fichas: Mapped[list["Ficha"]] = relationship(back_populates="professor")
    nome: Mapped[str] = mapped_column(String(150))
    telefone: Mapped[str] = mapped_column(String(20))
