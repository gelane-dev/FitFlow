from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.exercicio import ExercicioCriar, ExercicioAtualizar, ExercicioResposta, ExerciciosListaResposta
from ..models import Exercicio, Professor
from ..services.fichas import ator_professor_ou_admin
from ..core.seguranca import verificar_professor, obter_usuario_atual
from ..services.cloudinary import upload_imagem, upload_video, deletar_video, deletar_imagem
from pathlib import Path
import math
from typing import Literal

router = APIRouter()


def exigir_pode_alterar(ator: tuple, exercicio: Exercicio) -> None:
    """Admin altera qualquer exercício; professor altera os da biblioteca (sem autor) e os próprios."""
    tipo, perfil = ator
    if tipo == "professor" and exercicio.criado_por_professor_id not in (None, perfil.id):
        raise HTTPException(
            status_code=403,
            detail="Exercício de outro professor"
        )


@router.post("/exercicios", response_model=ExercicioResposta)
def cria_exercicio(dados: ExercicioCriar, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    exercicio = Exercicio(
        nome=dados.nome,
        descricao=dados.descricao,
        grupo_muscular=dados.grupo_muscular,
        instrucoes=dados.instrucoes,
        criado_por_professor_id=professor.id,
    )

    db.add(exercicio)
    db.commit()
    db.refresh(exercicio)

    return exercicio


@router.get("/exercicios", response_model=ExerciciosListaResposta)
def listar_exercicios(pagina: int = Query(1, ge=1), limite: int = Query(50, ge=1, le=100), grupo_muscular: str | None = None, busca: str | None = None, origem: Literal["biblioteca", "meus"] | None = None, usuario=Depends(obter_usuario_atual), db: Session = Depends(get_db)):
   
    offset = (pagina - 1) * limite

    consulta = select(Exercicio).where(Exercicio.ativo.is_(True))
    
    if busca: consulta = consulta.where(Exercicio.nome.ilike(f"%{busca}%"))
    if grupo_muscular: consulta = consulta.where(Exercicio.grupo_muscular.ilike(f"%{grupo_muscular}%"))

    if origem == "biblioteca":
        consulta = consulta.where(Exercicio.criado_por_professor_id.is_(None))
    elif origem == "meus":
        # "Meus" só existe para professor; para os demais perfis a lista é vazia
        professor = db.scalar(select(Professor).where(Professor.user_id == usuario.id)) if usuario.tipo == "professor" else None
        consulta = consulta.where(Exercicio.criado_por_professor_id == (professor.id if professor else -1))

    total = db.scalar(
    select(func.count()).select_from(consulta.subquery()))

    total_paginas = math.ceil(total / limite)
    
    consulta = consulta.offset(offset).limit(limite)

    exercicios = db.scalars(consulta).all()

    return ExerciciosListaResposta(
    itens=exercicios,
    pagina=pagina,
    limite=limite,
    total=total,
    total_paginas=total_paginas
    )

@router.get("/exercicios/{id}", response_model=ExercicioResposta)
def lista_exercicio(id: int, ator=Depends(ator_professor_ou_admin), db: Session = Depends(get_db)):

    exercicio = db.scalar(
        select(Exercicio).where(Exercicio.id == id).where(Exercicio.ativo.is_(True)))

    if not exercicio:
        raise HTTPException(
            status_code=404,
            detail="Exercicio não encontrado"
        )
    
    return exercicio


@router.put("/exercicios/{id}", response_model=ExercicioResposta)
def atualizar_exercicio(id: int, dados: ExercicioAtualizar, ator=Depends(ator_professor_ou_admin), db: Session = Depends(get_db)):

    exercicio = db.scalar(
        select(Exercicio).where(Exercicio.id == id).where(Exercicio.ativo.is_(True)))

    if not exercicio:
        raise HTTPException(
            status_code=404,
            detail="Exercicio não encontrado"
        )

    exigir_pode_alterar(ator, exercicio)

    exercicio.nome = dados.nome
    exercicio.descricao = dados.descricao
    exercicio.grupo_muscular = dados.grupo_muscular
    if "instrucoes" in dados.model_fields_set:
        exercicio.instrucoes = dados.instrucoes

    db.commit()
    db.refresh(exercicio)

    return exercicio


@router.delete("/exercicios/{id}")
def deletar_exercicio(id: int, ator=Depends(ator_professor_ou_admin), db: Session = Depends(get_db)):

    exercicio = db.scalar(
        select(Exercicio).where(Exercicio.id == id).where(Exercicio.ativo.is_(True)))

    if not exercicio:
        raise HTTPException(
            status_code=404,
            detail="Exercicio não encontrado"
        )

    exigir_pode_alterar(ator, exercicio)

    if exercicio.imagem_public_id:
        deletar_imagem(exercicio.imagem_public_id)
        exercicio.imagem = None
        exercicio.imagem_public_id = None
    
    if exercicio.video_public_id:
        deletar_video(exercicio.video_public_id)
        exercicio.video = None
        exercicio.video_public_id = None
       
    exercicio.ativo = False
    
    db.commit()

    return {"mensagem": "exercício deletado com sucesso"}

@router.put("/exercicios/{id}/imagem")
async def colocar_imagem(id: int, arquivo: UploadFile = File(), ator=Depends(ator_professor_ou_admin), db: Session = Depends(get_db)):

    exercicio = db.scalar(
        select(Exercicio).where(Exercicio.id == id).where(Exercicio.ativo.is_(True)))

    if not exercicio:
        raise HTTPException(
            status_code=404,
            detail="Exercicio não encontrado"
        )
    
    exigir_pode_alterar(ator, exercicio)

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

    await arquivo.seek(0)
    
    if exercicio.imagem_public_id:
        deletar_imagem(exercicio.imagem_public_id)
    
    url, public_id = upload_imagem(arquivo)
    
    exercicio.imagem = url
    exercicio.imagem_public_id = public_id

    db.commit()
    db.refresh(exercicio)

    return  {"mensagem": "Imagem do exercício atualizada com sucesso"}

@router.put("/exercicios/{id}/video")
async def colocar_video(id: int, arquivo: UploadFile = File(), ator=Depends(ator_professor_ou_admin), db: Session = Depends(get_db)):

    exercicio = db.scalar(
        select(Exercicio).where(Exercicio.id == id).where(Exercicio.ativo.is_(True)))

    if not exercicio:
        raise HTTPException(
            status_code=404,
            detail="Exercicio não encontrado"
        )

    exigir_pode_alterar(ator, exercicio)

    if arquivo.content_type not in ["video/mp4", "video/webm", "video/quicktime"]:
        raise HTTPException(
            status_code=400,
            detail="Formato de vídeo não permitido"
    )

    video_bytes = await arquivo.read()

    tamanho = len(video_bytes)

    if tamanho > 50 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="O vídeo deve ter no máximo 50 MB"
        )
    
    await arquivo.seek(0)
    
    if exercicio.video_public_id:
        deletar_video(exercicio.video_public_id)

    url, public_id = upload_video(arquivo)
    
    exercicio.video = url
    exercicio.video_public_id = public_id

    db.commit()
    db.refresh(exercicio)

    return  {"mensagem": "Video do exercício atualizada com sucesso"}
