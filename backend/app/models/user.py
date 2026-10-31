from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(150), unique=True)
    senha: Mapped[str] = mapped_column(String(255))
    tipo: Mapped[str] = mapped_column(String(50), default="aluno")
    professor: Mapped["Professor"] = relationship(back_populates="user", uselist=False)
    aluno: Mapped["Aluno"] = relationship(back_populates="user", uselist=False)
    foto: Mapped[str | None] = mapped_column(String(255), nullable=True)
