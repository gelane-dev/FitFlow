from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..core.tempo import agora_naive
from .base import Base


class FichaVersao(Base):
    __tablename__ = "fichas_versoes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ficha_id: Mapped[int] = mapped_column(ForeignKey("fichas.id"))
    numero: Mapped[int] = mapped_column(Integer)
    publicada_em: Mapped[datetime] = mapped_column(DateTime, default=agora_naive)
    publicada_por_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    conteudo: Mapped[dict] = mapped_column(JSON)

    __table_args__ = (UniqueConstraint("ficha_id", "numero", name="uq_fichas_versoes_ficha_numero"),)
