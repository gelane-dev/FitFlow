from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Aluno


def obter_aluno_acessivel(db: Session, ator: tuple, aluno_id: int) -> Aluno:
    """Aluno que o ator pode consultar: admin vê todos; professor só os vinculados.

    `ator` é o retorno de verificar_professor_ou_admin: ("admin", User) ou ("professor", Professor).
    Aluno inexistente ou de outro professor → 404 igual, para não revelar a existência.
    """

    tipo, perfil = ator

    aluno = db.scalar(select(Aluno).where(Aluno.id == aluno_id))

    if not aluno or (tipo == "professor" and aluno.professor_id != perfil.id):
        raise HTTPException(
            status_code=404,
            detail="Aluno não encontrado"
        )

    return aluno
