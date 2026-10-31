from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, contains_eager

from ..database import get_db
from ..core.seguranca import verificar_professor, verificar_aluno
from ..schemas.treino import TreinoCriar, TreinoResposta, AtualizarTreino, TreinoDiaResposta, OrdenarItens
from ..schemas.treino import ItemTreinoDiaResposta
from ..services.respostas import montar_item_treino
from ..services.fichas import contar_itens_por_treino
from ..models import Ficha, Treino, ItemFicha, Exercicio
from ..core.tempo import agora
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
    totais = contar_itens_por_treino(db, [treino.id for treino in treinos])

    return [
        TreinoResposta(
            id=treino.id,
            ficha_id=treino.ficha_id,
            nome=treino.nome,
            dia_semana=treino.dia_semana,
            ordem=treino.ordem,
            total_itens=totais.get(treino.id, 0),
        )
        for treino in treinos
    ]

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

    return TreinoResposta(
        id=treino.id,
        ficha_id=treino.ficha_id,
        nome=treino.nome,
        dia_semana=treino.dia_semana,
        ordem=treino.ordem,
        total_itens=contar_itens_por_treino(db, [treino.id]).get(treino.id, 0),
    )

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

    dia_atual = list(DiaSemana)[agora().weekday()]

    treinos = db.scalars(
     select(Treino).where(Treino.ficha_id == ficha.id, Treino.ativo.is_(True), Treino.dia_semana == dia_atual).order_by(Treino.ordem)).all()
    
    # Uma consulta para os itens de todos os treinos do dia, já com o exercício (evita N+1)
    itens_por_treino = {treino.id: [] for treino in treinos}
    itens_ativos = db.scalars(
        select(ItemFicha).join(Exercicio).options(contains_eager(ItemFicha.exercicio)).where(
            ItemFicha.treino_id.in_(itens_por_treino), ItemFicha.ativo.is_(True), Exercicio.ativo.is_(True)
        ).order_by(ItemFicha.ordem)).all()
    for item in itens_ativos:
        itens_por_treino[item.treino_id].append(item)

    treinos_resposta = []

    for treino in treinos:
        itens_resposta = [montar_item_treino(item) for item in itens_por_treino[treino.id]]

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

@router.put("/treino/{treino_id}/itens/ordem", response_model=list[ItemTreinoDiaResposta])
def reordenar_itens(treino_id: int, dados: OrdenarItens, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    treino = db.scalar(
        select(Treino).where(Treino.id == treino_id, Treino.ativo.is_(True)))

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

    itens = db.scalars(
        select(ItemFicha).where(ItemFicha.treino_id == treino.id, ItemFicha.ativo.is_(True))).all()
    por_id = {item.id: item for item in itens}

    novas = {}
    for pedido in dados.itens:
        if pedido.id not in por_id:
            raise HTTPException(
                status_code=404,
                detail="Item da ficha não encontrado"
            )
        if pedido.id in novas:
            raise HTTPException(
                status_code=400,
                detail="Ordens duplicadas"
            )
        novas[pedido.id] = pedido.ordem

    # Ordem final de todos os itens ativos (os não enviados mantêm a atual)
    finais = [novas.get(item.id, item.ordem) for item in itens]

    if len(set(finais)) != len(finais):
        raise HTTPException(
            status_code=400,
            detail="Ordens duplicadas"
        )

    for item_id, ordem in novas.items():
        por_id[item_id].ordem = ordem

    db.commit()

    ordenados = db.scalars(
        select(ItemFicha).join(Exercicio).options(contains_eager(ItemFicha.exercicio)).where(
            ItemFicha.treino_id == treino.id, ItemFicha.ativo.is_(True), Exercicio.ativo.is_(True)
        ).order_by(ItemFicha.ordem)).all()

    return [montar_item_treino(item) for item in ordenados]
