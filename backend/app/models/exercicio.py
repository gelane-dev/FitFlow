from sqlalchemy import String, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

class Exercicio(Base):
    __tablename__ = "exercicios"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(150))
    descricao: Mapped[str] = mapped_column(String(500))
    grupo_muscular: Mapped[str] = mapped_column(String(150))
    itens: Mapped[list["ItemFicha"]] = relationship(back_populates="exercicio")
    imagem: Mapped[str] = mapped_column(String(500), nullable=True)
    imagem_public_id: Mapped[str] = mapped_column(String(500), nullable=True)
    video: Mapped[str] = mapped_column(String(500), nullable=True)
    video_public_id: Mapped[str] = mapped_column(String(500), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)