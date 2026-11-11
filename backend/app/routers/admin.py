from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.professor import ProfessorCriar
from ..models import User, Professor
from ..core.seguranca import criar_hash, verificar_admin
from ..core.tempo import agora_naive
from ..services import auditoria
from ..services.equipe import flush_unico

router = APIRouter()


@router.post("/admin/professores")
def criar_professor(dados: ProfessorCriar, admin=Depends(verificar_admin), db: Session = Depends(get_db)):

    usuario_existente = db.scalar(
        select(User).where(User.email == dados.email))

    if usuario_existente:
        raise HTTPException(
            status_code=400,
            detail="E-mail já cadastrado"
        )

    usuario = User(
        email=dados.email,
        senha=criar_hash(dados.senha),
        tipo="professor",
        criado_em=agora_naive()
    )

    db.add(usuario)
    flush_unico(db)

    professor = Professor(
        user_id=usuario.id,
        nome=dados.nome,
        telefone=dados.telefone
    )

    db.add(professor)
    db.flush()

    auditoria.registrar(db, admin, "professor.criar", "professor", professor.id, f"Professor {professor.nome} criado")

    db.commit()
    db.refresh(professor)

    return {"mensagem": "Professor criado com sucesso"}
