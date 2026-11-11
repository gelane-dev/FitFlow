from sqlalchemy import JSON, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Recepcionista(Base):
    __tablename__ = "recepcionistas"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    nome: Mapped[str] = mapped_column(String(150))
    telefone: Mapped[str] = mapped_column(String(20))
    permissoes: Mapped[list] = mapped_column(JSON, default=list)
