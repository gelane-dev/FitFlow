from datetime import datetime

from sqlalchemy import Integer, String, ForeignKey, DateTime, Index, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

class SessaoTreino(Base):
    __tablename__ = "sessoes_treino"
    __table_args__ = (
        # Uma única sessão aberta por aluno/treino (ADR-029)
        Index(
            "uq_sessoes_treino_aberta", "aluno_id", "treino_id", unique=True,
            sqlite_where=text("finalizada_em IS NULL"),
            postgresql_where=text("finalizada_em IS NULL"),
        ),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    aluno_id: Mapped[int] = mapped_column(ForeignKey("alunos.id"))
    aluno: Mapped["Aluno"] = relationship()
    treino_id: Mapped[int] = mapped_column(ForeignKey("treino.id"))
    treino: Mapped["Treino"] = relationship()
    iniciada_em: Mapped[datetime] = mapped_column(DateTime)
    finalizada_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    esforco: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comentario: Mapped[str | None] = mapped_column(String(500), nullable=True)
    execucoes: Mapped[list["HistoricoExecucao"]] = relationship(back_populates="sessao")
