from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Professor, Aluno, Recepcionista
from .config import obter_obrigatoria, JWT_EXPIRA_MINUTOS, COOKIE_SECURE, COOKIE_SAMESITE

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

NOME_COOKIE = "fitflow_sessao"
HEADER_CLIENTE = "X-FitFlow-Client"
VALOR_HEADER_CLIENTE = "web"
METODOS_SEGUROS = ("GET", "HEAD", "OPTIONS")

# auto_error=False: o token também pode vir do cookie da web (ADR-034)
seguranca = HTTPBearer(auto_error=False)


def definir_cookie_sessao(response: Response, token: str) -> None:
    response.set_cookie(
        NOME_COOKIE, token,
        max_age=JWT_EXPIRA_MINUTOS * 60, path="/",
        httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE,
    )


def apagar_cookie_sessao(response: Response) -> None:
    response.delete_cookie(
        NOME_COOKIE, path="/", httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE,
    )


def verificar_token(
    request: Request,
    credenciais: HTTPAuthorizationCredentials | None = Depends(seguranca),
    db: Session = Depends(get_db),
):
    """Valida o JWT (Bearer ou cookie) e devolve o payload. Conta desativada → 401."""

    if credenciais:
        token = credenciais.credentials
        via_cookie = False
    else:
        token = request.cookies.get(NOME_COOKIE)
        via_cookie = True
        if not token:
            raise seguranca.make_not_authenticated_error()

    # Proteção CSRF: cookie é enviado sozinho pelo navegador; o header força preflight de CORS
    if via_cookie and request.method not in METODOS_SEGUROS             and request.headers.get(HEADER_CLIENTE) != VALOR_HEADER_CLIENTE:
        raise HTTPException(status_code=403, detail="Requisição sem cabeçalho de origem")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")

    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")

    usuario = db.scalar(select(User).where(User.id == user_id))
    _exigir_conta_ativa(usuario)
    # guarda o usuário para obter_usuario_atual não repetir a consulta na mesma requisição
    request.state.usuario_autenticado = usuario

    return payload


def _exigir_conta_ativa(usuario: User | None) -> None:
    if usuario is not None and not usuario.ativo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Conta desativada")


def obter_usuario_atual(request: Request, verificar: dict = Depends(verificar_token)) -> User:
    """Usuário autenticado (Bearer ou cookie). Inexistente → 401; desativado → 401 "Conta desativada"."""

    usuario = getattr(request.state, "usuario_autenticado", None)

    if not usuario:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")

    _exigir_conta_ativa(usuario)

    return usuario


def exigir_papeis(*tipos: str):
    """Dependência que devolve o User se o tipo estiver em `tipos`; senão 403."""

    def dependencia(usuario: User = Depends(obter_usuario_atual)) -> User:
        if usuario.tipo not in tipos:
            raise HTTPException(status_code=403, detail="Acesso não permitido para este perfil")
        return usuario

    return dependencia


def exigir_permissao(nome: str):
    """Admin sempre passa; recepção precisa da permissão; demais perfis → 403."""

    def dependencia(usuario: User = Depends(obter_usuario_atual), db: Session = Depends(get_db)) -> User:
        if usuario.tipo == "admin":
            return usuario

        if usuario.tipo != "recepcao":
            raise HTTPException(status_code=403, detail="Acesso não permitido para este perfil")

        recepcionista = db.scalar(select(Recepcionista).where(Recepcionista.user_id == usuario.id))

        if not recepcionista or nome not in (recepcionista.permissoes or []):
            raise HTTPException(status_code=403, detail="Permissão insuficiente")

        return usuario

    return dependencia


def _obter_usuario_com_tipo(tipo: str, mensagem_403: str, usuario: User) -> User:

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

def verificar_professor(usuario: User = Depends(obter_usuario_atual), db: Session = Depends(get_db)):
    """Retorna o perfil Professor (professor.id é o id de professores, não de users)."""

    mensagem = "Acesso permitido apenas para professor"
    usuario = _obter_usuario_com_tipo("professor", mensagem, usuario)

    return _obter_perfil(Professor, usuario, mensagem, db)

def verificar_aluno(usuario: User = Depends(obter_usuario_atual), db: Session = Depends(get_db)):
    """Retorna o perfil Aluno (aluno.id é o id de alunos, não de users)."""

    mensagem = "Acesso permitido apenas para alunos"
    usuario = _obter_usuario_com_tipo("aluno", mensagem, usuario)

    return _obter_perfil(Aluno, usuario, mensagem, db)

def verificar_admin(usuario: User = Depends(obter_usuario_atual)):

    return _obter_usuario_com_tipo("admin", "Acesso permitido apenas para admin", usuario)

def verificar_aluno_ou_professor(usuario: User = Depends(obter_usuario_atual), db: Session = Depends(get_db)):
    """Retorna (tipo, perfil) para endpoints compartilhados entre aluno e professor."""

    if usuario.tipo == "aluno":
        return "aluno", _obter_perfil(Aluno, usuario, "Acesso permitido apenas para alunos ou professores", db)

    if usuario.tipo == "professor":
        return "professor", _obter_perfil(Professor, usuario, "Acesso permitido apenas para alunos ou professores", db)

    raise HTTPException(status_code=403, detail="Acesso permitido apenas para alunos ou professores")

def verificar_professor_ou_admin(usuario: User = Depends(obter_usuario_atual), db: Session = Depends(get_db)):
    """Retorna ("admin", User) ou ("professor", Professor)."""

    mensagem = "Acesso permitido apenas para professor ou admin"

    if usuario.tipo == "admin":
        return "admin", usuario

    if usuario.tipo == "professor":
        return "professor", _obter_perfil(Professor, usuario, mensagem, db)

    raise HTTPException(status_code=403, detail=mensagem)
