from pathlib import Path
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.usuario import (
    UsuarioResposta,
    ProfessorAtualizar,
    AlunoAtualizar,
    AlunoResposta,
    ProfessorResposta,
    EmailAtualizar,
    SenhaAtualizar,
)
from ..models import User, Professor, Aluno
from ..core.seguranca import (
    criar_hash,
    verificar_senha,
    verificar_token,
    verificar_professor,
    verificar_aluno,
)

router = APIRouter()


@router.get("/alunos", response_model=list[AlunoResposta])
def listar_alunos(professor=Depends(verificar_professor), db: Session = Depends(get_db)):
    alunos = db.scalars(
        select(Aluno).order_by(Aluno.nome)
    ).all()

    return alunos


@router.get("/perfil", response_model=UsuarioResposta)
def meu_perfil(verificar: dict = Depends(verificar_token), db: Session = Depends(get_db)):

    id_usuario = int(verificar["sub"])

    usuario = db.scalar(
        select(User).where(User.id == id_usuario))

    if not usuario:
        raise HTTPException(
            status_code=401,
            detail="Usuario não encontrado"
        )

    return usuario


@router.get("/perfil/professor", response_model=ProfessorResposta)
def meu_perfil_professor(professor=Depends(verificar_professor), verificar: dict = Depends(verificar_token), db: Session = Depends(get_db)):

    id_usuario = int(verificar["sub"])

    usuario = db.scalar(
        select(Professor).where(Professor.user_id == id_usuario))

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Perfil de professor não encontrado"
        )

    return usuario


@router.get("/perfil/aluno", response_model=AlunoResposta)
def meu_perfil_aluno(aluno=Depends(verificar_aluno), verificar: dict = Depends(verificar_token), db: Session = Depends(get_db)):

    id_usuario = int(verificar["sub"])

    usuario = db.scalar(
        select(Aluno).where(Aluno.user_id == id_usuario))

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Perfil de aluno não encontrado"
        )

    return usuario


@router.put("/perfil/professor")
def perfil_professor(dados: ProfessorAtualizar, verificar: dict = Depends(verificar_token), db: Session = Depends(get_db)):

    id_usuario = int(verificar["sub"])

    usuario = db.scalar(
        select(User).where(User.id == id_usuario))

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuario não encontrado"
        )

    if usuario.tipo != "professor":
        raise HTTPException(
            status_code=403,
            detail="Acesso permitido apenas para professores"
        )

    professor = db.scalar(
        select(Professor).where(Professor.user_id == id_usuario))

    if not professor:
        raise HTTPException(
            status_code=404,
            detail="Perfil de professor não encontrado"
        )

    professor.nome = dados.nome
    professor.telefone = dados.telefone

    db.commit()

    return {"mensagem": "Alterações feitas"}


@router.put("/perfil/aluno")
def perfil_aluno(dados: AlunoAtualizar, verificar: dict = Depends(verificar_token), db: Session = Depends(get_db)):

    id_usuario = int(verificar["sub"])

    usuario = db.scalar(
        select(User).where(User.id == id_usuario))

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuario não encontrado"
        )

    if usuario.tipo != "aluno":
        raise HTTPException(
            status_code=403,
            detail="Acesso permitido apenas para alunos"
        )

    aluno = db.scalar(
        select(Aluno).where(Aluno.user_id == id_usuario))

    if not aluno:
        raise HTTPException(
            status_code=404,
            detail="Perfil de aluno não encontrado"
        )

    aluno.nome = dados.nome
    aluno.telefone = dados.telefone
    aluno.data_nascimento = dados.data_nascimento

    db.commit()

    return {"mensagem": "Alterações feitas"}


@router.put("/perfil/email")
def mudar_email(dados: EmailAtualizar, verificar: dict = Depends(verificar_token), db: Session = Depends(get_db)):

    id_usuario = int(verificar["sub"])

    usuario = db.scalar(
        select(User).where(User.id == id_usuario))

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuario não encontrado"
        )

    usuario_existente = db.scalar(
        select(User).where(User.email == dados.email))

    if usuario_existente:
        raise HTTPException(
            status_code=400,
            detail="E-mail já cadastrado"
        )

    usuario.email = dados.email

    db.commit()

    return {"mensagem": "E-mail alterado com sucesso"}


@router.put("/perfil/senha")
def mudar_senha(dados: SenhaAtualizar, verificar: dict = Depends(verificar_token), db: Session = Depends(get_db)):

    id_usuario = int(verificar["sub"])

    usuario = db.scalar(
        select(User).where(User.id == id_usuario))

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuario não encontrado"
        )

    if not verificar_senha(dados.senha_atual, usuario.senha):
        raise HTTPException(
            status_code=401,
            detail="Senha atual incorreta"
        )

    usuario.senha = criar_hash(dados.nova_senha)

    db.commit()

    return {"mensagem": "Senha alterada com sucesso"}


@router.put("/perfil/foto")
async def mudar_foto(arquivo: UploadFile = File(), verificar: dict = Depends(verificar_token), db: Session = Depends(get_db)):

    id_usuario = int(verificar["sub"])

    usuario = db.scalar(
        select(User).where(User.id == id_usuario))

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuario não encontrado"
        )

    extensao = Path(arquivo.filename).suffix.lower()

    extensoes_permitidas = [".jpg", ".jpeg", ".png"]

    if extensao not in extensoes_permitidas:
        raise HTTPException(
            status_code=400,
            detail="Formato de imagem não permitido"
        )

    imagem_bytes = await arquivo.read()

    tamanho = len(imagem_bytes)

    if tamanho > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="A imagem deve ter no máximo 5 MB"
        )

    pasta = Path("uploads/perfis")
    pasta.mkdir(parents=True, exist_ok=True)

    nome_arquivo = f"{uuid.uuid4().hex[:12]}{extensao}"

    caminho = pasta / nome_arquivo

    with open(caminho, "wb") as imagem:
        imagem.write(imagem_bytes)

    if usuario.foto:
        caminho_antigo = Path(usuario.foto)

        if caminho_antigo.exists():
            caminho_antigo.unlink()

    usuario.foto = str(caminho)

    db.commit()

    return {"mensagem": "Foto de perfil atualizada com sucesso"}


@router.get("/perfil/foto")
def exibir_foto(verificar: dict = Depends(verificar_token), db: Session = Depends(get_db)):

    id_usuario = int(verificar["sub"])

    usuario = db.scalar(
        select(User).where(User.id == id_usuario))

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuário não encontrado"
        )

    if not usuario.foto:
        raise HTTPException(
            status_code=404,
            detail="Foto de perfil não encontrada"
        )

    caminho = Path(usuario.foto)

    if not caminho.exists():
        raise HTTPException(
            status_code=404,
            detail="Arquivo da foto não encontrado"
        )

    return FileResponse(caminho)


@router.delete("/perfil/foto")
def remover_foto(verificar: dict = Depends(verificar_token), db: Session = Depends(get_db)):

    id_usuario = int(verificar["sub"])

    usuario = db.scalar(
        select(User).where(User.id == id_usuario))

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuário não encontrado"
        )

    if not usuario.foto:
        raise HTTPException(
            status_code=404,
            detail="Foto de perfil não encontrada"
        )

    caminho = Path(usuario.foto)

    if not caminho.exists():
        raise HTTPException(
            status_code=404,
            detail="Arquivo da foto não encontrado"
        )

    caminho.unlink()

    usuario.foto = None

    db.commit()

    return {"mensagem": "Foto de perfil removida com sucesso"}
