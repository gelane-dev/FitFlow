from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, Integer, String, false
from sqlalchemy.orm import Mapped, mapped_column

from ..core.tempo import agora_naive
from .base import Base


class Acesso(Base):
    __tablename__ = "acessos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    aluno_id: Mapped[int] = mapped_column(ForeignKey("alunos.id"))
    data_hora: Mapped[datetime] = mapped_column(DateTime, default=agora_naive)
    resultado: Mapped[str] = mapped_column(String(20))
    motivos: Mapped[list] = mapped_column(JSON, default=list)
    origem: Mapped[str] = mapped_column(String(20), default="manual", server_default="manual")
    liberacao_manual: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    registrado_por_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    __table_args__ = (
        Index("ix_acessos_aluno_data", "aluno_id", "data_hora"),
        Index("ix_acessos_data_hora", "data_hora"),
    )
