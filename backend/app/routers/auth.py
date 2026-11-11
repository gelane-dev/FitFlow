from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.usuario import UsuarioCriar, UsuarioResposta, UsuarioLogin
from ..models import User, Aluno
from ..core.seguranca import criar_hash, verificar_senha, criar_token, definir_cookie_sessao, apagar_cookie_sessao
from ..core.tempo import agora_naive

MENSAGENS_CADASTRO = {
    "pendente": "Cadastro aguardando aprovação da recepção",
    "recusado": "Cadastro não aprovado. Procure a recepção",
}

router = APIRouter()


@router.post("/login")
def logar(dados: UsuarioLogin, response: Response, db: Session = Depends(get_db)):

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

    if not usuario.ativo:
        raise HTTPException(
            status_code=403,
            detail="Conta desativada"
        )

    if usuario.tipo == "aluno":
        aluno = db.scalar(select(Aluno).where(Aluno.user_id == usuario.id))

        if aluno and aluno.status_cadastro in MENSAGENS_CADASTRO:
            raise HTTPException(
                status_code=403,
                detail=MENSAGENS_CADASTRO[aluno.status_cadastro]
            )

    token = criar_token(usuario.id)
    definir_cookie_sessao(response, token)

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.post("/logout")
def sair(response: Response):

    apagar_cookie_sessao(response)

    return {"mensagem": "Sessão encerrada"}


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
        senha=criar_hash(dados.senha),
        criado_em=agora_naive()
    )

    db.add(usuario)
    db.flush()

    aluno = Aluno(
        user_id=usuario.id,
        nome=dados.nome,
        telefone=dados.telefone,
        data_nascimento=dados.data_nascimento,
        status_cadastro="pendente"
    )

    db.add(aluno)
    db.commit()
    db.refresh(usuario)

    return usuario
