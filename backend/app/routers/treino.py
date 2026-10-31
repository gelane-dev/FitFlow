from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..core.seguranca import verificar_professor, verificar_aluno
from ..schemas.treino import TreinoCriar, TreinoResposta, AtualizarTreino, TreinoDiaResposta, ItemTreinoDiaResposta, TreinoDiaResposta
from ..models import Ficha, Treino, ItemFicha, Exercicio
from datetime import datetime
from ..enums.dia_semana import DiaSemana

router = APIRouter()

@router.post("/treino", response_model=TreinoResposta)
def criar_treino(dados: TreinoCriar, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    ficha = db.scalar(
        select(Ficha).where(Ficha.id  == dados.ficha_id, Ficha.ativo.is_(True)))

    if not ficha:
        raise HTTPException(
            status_code=404,
            detail="Ficha não encontrada"
        )
    
    if ficha.professor_id != professor.id:
        raise HTTPException(
            status_code=403,
            detail="Você não é o professor responsável por esta ficha"
        )

    verificar_ordem = db.scalar(
        select(Treino).where(Treino.ficha_id  == dados.ficha_id, Treino.ativo.is_(True), Treino.ordem == dados.ordem))
    
    if verificar_ordem:
        raise HTTPException(
            status_code=409,
            detail="Já existe um treino com esta ordem nesta ficha"
        )
    
    treino = Treino(
        ficha_id = dados.ficha_id,
        nome = dados.nome,
        dia_semana = dados.dia_semana,
        ordem = dados.ordem,
        ativo=True
    )
        
    db.add(treino)
    db.commit()
    db.refresh(treino)

    return treino

@router.get("/treino/ficha/{ficha_id}", response_model=list[TreinoResposta])
def listar_treinos(ficha_id: int, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    ficha = db.scalar(select(Ficha).where(Ficha.id == ficha_id, Ficha.ativo.is_(True)))

    if not ficha:
        raise HTTPException(
            status_code=404,
            detail="Ficha não encontrada"
        )
    
    if ficha.professor_id != professor.id:
        raise HTTPException(
            status_code=403,
            detail="Você não tem permissão para visualizar os treinos desta ficha"
        )
    
    treinos = db.scalars(
        select(Treino).where(Treino.ficha_id == ficha_id, Treino.ativo.is_(True)).order_by(Treino.ordem)
    ).all()
    
    return treinos

@router.put("/treino/{id}", response_model=TreinoResposta)
def atualizar_treino(id: int, dados: AtualizarTreino, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    treino = db.scalar(
        select(Treino).where(Treino.id == id, Treino.ativo.is_(True)))

    if not treino:
        raise HTTPException(
            status_code=404,
            detail="Treino não encontrado"
        )

    ficha = db.scalar(
        select(Ficha).where(Ficha.id == treino.ficha_id, Ficha.ativo.is_(True)))
    
    if not ficha:
        raise HTTPException(
            status_code=404,
            detail="Ficha não encontrada"
        )

    if ficha.professor_id != professor.id:
        raise HTTPException(
            status_code=403,
            detail="Você não tem permissão para alterar esta ficha de treino"
        )

    verificar_ordem = db.scalar(
        select(Treino).where(Treino.ficha_id == ficha.id, Treino.ativo.is_(True), Treino.ordem == dados.ordem,  Treino.id != id))
    
    if verificar_ordem:
        raise HTTPException(
            status_code=409,
            detail="Já existe um treino com esta ordem nesta ficha"
        )
    
    treino.nome = dados.nome
    treino.dia_semana = dados.dia_semana
    treino.ordem = dados.ordem

    db.commit()
    db.refresh(treino)
    
    return treino

@router.delete("/treino/{id}")
def deletar_treino(id: int, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    treino = db.scalar(
        select(Treino).where(Treino.id == id, Treino.ativo.is_(True)))

    if not treino:
        raise HTTPException(
            status_code=404,
            detail="Treino não encontrado"
        )
    
    ficha = db.scalar(
        select(Ficha).where(Ficha.id == treino.ficha_id, Ficha.ativo.is_(True)))
    
    if not ficha:
        raise HTTPException(
            status_code=404,
            detail="Ficha não encontrada"
        )   

    if ficha.professor_id != professor.id:
        raise HTTPException(
            status_code=403,
            detail="Você não tem permissão para excluir este treino"
        )

    verificar = db.scalars(
        select(ItemFicha).where(ItemFicha.treino_id == treino.id, ItemFicha.ativo.is_(True))).all()

    for item in verificar:
        item.ativo = False

    treino.ativo = False

    db.commit()

    return {"mensagem": "Treino excluído com sucesso"}

@router.get("/treino/hoje/{ficha_id}", response_model=list[TreinoDiaResposta])
def treinos_dia(ficha_id: int, aluno=Depends(verificar_aluno), db: Session = Depends(get_db)):

    ficha = db.scalar(select(Ficha).where(Ficha.id == ficha_id, Ficha.ativo.is_(True)))

    if not ficha:
        raise HTTPException(
            status_code=404,
            detail="Você não tem ficha salva"
        )
    
    if ficha.aluno_id != aluno.id:
        raise HTTPException(
            status_code=404,
            detail="Essa ficha não é sua"
        )

    dia_atual = list(DiaSemana)[datetime.now().weekday()]

    treinos = db.scalars(
     select(Treino).where(Treino.ficha_id == ficha.id, Treino.ativo.is_(True), Treino.dia_semana == dia_atual)).order_by(Treino.ordem).all()
    
    if not treinos:
        raise HTTPException(
            status_code=404,
            detail="Você não tem treinos salvos"
        )
    
    treinos_resposta = []

    for treino in treinos:
        item_treino = db.scalars(
        select(ItemFicha).join(Exercicio).where(ItemFicha.treino_id == treino.id, ItemFicha.ativo.is_(True), Exercicio.ativo.is_(True)).order_by(ItemFicha.ordem)).all()
        
        itens_resposta =[]
        
        for item in item_treino:
            item_resposta = ItemTreinoDiaResposta(id=item.id,
                ficha_id=item.ficha_id,
                treino_id=item.treino_id,
                exercicio_id=item.exercicio_id,
                series=item.series,
                repeticoes=item.repeticoes,
                carga=item.carga,
                descanso=item.descanso,
                ordem=item.ordem,
                nome=item.exercicio.nome,
                descricao=item.exercicio.descricao,
                grupo_muscular=item.exercicio.grupo_muscular,
                imagem=item.exercicio.imagem,
                video=item.exercicio.video
            )
            
            itens_resposta.append(item_resposta)
    
        treino_resposta = TreinoDiaResposta(
            id=treino.id,
            ficha_id=treino.ficha_id,
            nome=treino.nome,
            dia_semana=treino.dia_semana,
            ordem=treino.ordem,
            itens=itens_resposta
        )

        treinos_resposta.append(treino_resposta)
    
    return treinos_resposta