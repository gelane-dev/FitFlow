from datetime import datetime

from sqlalchemy import String, Integer, Boolean, DateTime, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(150), unique=True)
    senha: Mapped[str] = mapped_column(String(255))
    tipo: Mapped[str] = mapped_column(String(50), default="aluno")
    professor: Mapped["Professor"] = relationship(back_populates="user", uselist=False)
    aluno: Mapped["Aluno"] = relationship(back_populates="user", uselist=False, foreign_keys="Aluno.user_id")
    foto: Mapped[str | None] = mapped_column(String(255), nullable=True)

    foto_public_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    criado_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
