from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
import os
from dotenv import load_dotenv

load_dotenv()

gerenciador_hash = PasswordHash((BcryptHasher(),))

def criar_hash(senha: str) -> str:

    return gerenciador_hash.hash(senha)

def verificar_senha(senha: str, senha_hash: str) -> bool:
    
    return gerenciador_hash.verify(senha, senha_hash)

SECRET_KEY= os.getenv("SECRET_KEY")
ALGORITHM="HS256"
    
def criar_token(id_usuario: int):
   
    payload = {
        "sub": str(id_usuario),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=30)
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

def verificar_professor(verificar = Depends(verificar_token), db: Session = Depends(get_db)):
    
    sub_usuario = int(verificar["sub"])

    usuario = db.scalar(
    select(User).where(User.id == sub_usuario))

    if not usuario.tipo == "professor":
        raise HTTPException(
            status_code=403,
            detail="Acesso permitido apenas para professor"
        )

    return usuario

def verificar_aluno(verificar = Depends(verificar_token), db: Session = Depends(get_db)):

    sub_usuario = int(verificar["sub"])

    usuario = db.scalar(
    select(User).where(User.id == sub_usuario))

    if not usuario.tipo == "aluno":
        raise HTTPException(
            status_code=403,
            detail="Acesso permitido apenas para alunos"
        )

    return usuario

def verificar_admin(verificar = Depends(verificar_token), db: Session = Depends(get_db)):

    sub_usuario = int(verificar["sub"])

    usuario = db.scalar(
    select(User).where(User.id == sub_usuario))

    if not usuario.tipo == "admin":
        raise HTTPException(
            status_code=403,
            detail="Acesso permitido apenas para admin"
        )

    return usuario