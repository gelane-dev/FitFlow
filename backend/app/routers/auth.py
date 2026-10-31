from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.usuario import UsuarioCriar, UsuarioResposta, UsuarioLogin
from ..models import User, Aluno
from ..core.seguranca import criar_hash, verificar_senha, criar_token

router = APIRouter()


@router.post("/login")
def logar(dados: UsuarioLogin, db: Session = Depends(get_db)):

    usuario = db.scalar(
        select(User).where(User.email == dados.email))

    if not usuario:
        raise HTTPException(
            status_code=401,
            detail="E-mail ou senha inválidos"
        )
    if not verificar_senha(dados.senha, usuario.senha):
        raise HTTPException(
            status_code=401,
            detail="E-mail ou senha inválidos"
        )

    token = criar_token(usuario.id)

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.post("/cadastro", response_model=UsuarioResposta)
def criar_usuario(dados: UsuarioCriar, db: Session = Depends(get_db)):

    usuario_existente = db.scalar(
        select(User).where(User.email == dados.email))

    if usuario_existente:
        raise HTTPException(
            status_code=400,
            detail="E-mail já cadastrado"
        )

    usuario = User(
        email=dados.email,
        senha=criar_hash(dados.senha)
    )

    db.add(usuario)
    db.flush()

    aluno = Aluno(
        user_id=usuario.id,
        nome=dados.nome,
        telefone=dados.telefone,
        data_nascimento=dados.data_nascimento
    )

    db.add(aluno)
    db.commit()
    db.refresh(usuario)

    return usuario
