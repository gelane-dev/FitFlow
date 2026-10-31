from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Professor, Aluno
from .config import obter_obrigatoria, JWT_EXPIRA_MINUTOS

SECRET_KEY = obter_obrigatoria("SECRET_KEY")

gerenciador_hash = PasswordHash((BcryptHasher(),))

def criar_hash(senha: str) -> str:

    return gerenciador_hash.hash(senha)

def verificar_senha(senha: str, senha_hash: str) -> bool:
    
    return gerenciador_hash.verify(senha, senha_hash)

ALGORITHM="HS256"
    
def criar_token(id_usuario: int):
   
    payload = {
        "sub": str(id_usuario),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRA_MINUTOS)
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

seguranca = HTTPBearer()

def verificar_token(credenciais: HTTPAuthorizationCredentials = Depends(seguranca)):

    token = credenciais.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload

    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")

def _obter_usuario_com_tipo(tipo: str, mensagem_403: str, verificar: dict, db: Session) -> User:

    usuario = db.scalar(
        select(User).where(User.id == int(verificar["sub"])))

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado"
        )

    if usuario.tipo != tipo:
        raise HTTPException(
            status_code=403,
            detail=mensagem_403
        )

    return usuario

def _obter_perfil(modelo, usuario: User, mensagem_403: str, db: Session):

    perfil = db.scalar(
        select(modelo).where(modelo.user_id == usuario.id))

    if not perfil:
        raise HTTPException(
            status_code=403,
            detail=mensagem_403
        )

    return perfil

def verificar_professor(verificar = Depends(verificar_token), db: Session = Depends(get_db)):
    """Retorna o perfil Professor (professor.id é o id de professores, não de users)."""

    mensagem = "Acesso permitido apenas para professor"
    usuario = _obter_usuario_com_tipo("professor", mensagem, verificar, db)

    return _obter_perfil(Professor, usuario, mensagem, db)

def verificar_aluno(verificar = Depends(verificar_token), db: Session = Depends(get_db)):
    """Retorna o perfil Aluno (aluno.id é o id de alunos, não de users)."""

    mensagem = "Acesso permitido apenas para alunos"
    usuario = _obter_usuario_com_tipo("aluno", mensagem, verificar, db)

    return _obter_perfil(Aluno, usuario, mensagem, db)

def verificar_admin(verificar = Depends(verificar_token), db: Session = Depends(get_db)):

    return _obter_usuario_com_tipo("admin", "Acesso permitido apenas para admin", verificar, db)

def verificar_aluno_ou_professor(verificar = Depends(verificar_token), db: Session = Depends(get_db)):
    """Retorna (tipo, perfil) para endpoints compartilhados entre aluno e professor."""

    usuario = db.scalar(
        select(User).where(User.id == int(verificar["sub"])))

    if not usuario:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")

    if usuario.tipo == "aluno":
        return "aluno", _obter_perfil(Aluno, usuario, "Acesso permitido apenas para alunos ou professores", db)

    if usuario.tipo == "professor":
        return "professor", _obter_perfil(Professor, usuario, "Acesso permitido apenas para alunos ou professores", db)

    raise HTTPException(status_code=403, detail="Acesso permitido apenas para alunos ou professores")
