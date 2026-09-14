from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from ..core.seguranca import verificar_professor, verificar_aluno
from ..schemas.ficha import FichaCriar, ItemFichaCriar, AtualizarFicha, FichaResposta, ItemFichaResposta, AtualizarItemFicha, ExecucaoHistorico, HistoricoResposta, FichaCompletaResposta
from ..models import Aluno, Ficha, ItemFicha, Exercicio, HistoricoExecucao, Treino

router = APIRouter()

@router.post("/ficha")
def criar_ficha(criar: FichaCriar, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    aluno = db.scalar(
        select(Aluno).where(Aluno.id == criar.aluno_id))

    if not aluno:
        raise HTTPException(
            status_code=404,
            detail="Aluno não encontrado"
        )

    ficha = Ficha(
        aluno_id = aluno.id,
        professor_id = professor.id,
        nome = criar.nome,
        data_criacao = datetime.now(),
        ativo=True
    )
        
    db.add(ficha) 
    db.commit()
    db.refresh(ficha)

    return ficha

@router.post("/ficha/itens")
def criar_itens_ficha(criar: ItemFichaCriar, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    ficha = db.scalar(
        select(Ficha).where(Ficha.id  == criar.ficha_id, Ficha.ativo.is_(True)))

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
    
    exercicio = db.scalar(select(Exercicio).where(Exercicio.id == criar.exercicio_id, Exercicio.ativo.is_(True)))
    
    if not exercicio:
        raise HTTPException(
            status_code=404,
            detail="Exercicio não encontrado"
        )

    treino = db.scalar(select(Treino).where(Treino.id == criar.treino_id, Treino.ativo.is_(True)))
        
    if not treino:
        raise HTTPException(
            status_code=404,
            detail="Treino não encontrado"
        )

    if criar.ficha_id != treino.ficha_id:
        raise HTTPException(
            status_code=404,
            detail="Treino não encontrado"
        )
    
    itemficha = db.scalar(select(ItemFicha).where(ItemFicha.treino_id == criar.treino_id, ItemFicha.exercicio_id == criar.exercicio_id, ItemFicha.ativo.is_(True)))
        
    if itemficha:
        raise HTTPException(
            status_code=409,
            detail="Exercício já cadastrado neste treino"
        )

    verificar_ordem = db.scalar(
        select(ItemFicha).where(ItemFicha.treino_id == criar.treino_id, ItemFicha.ativo.is_(True), ItemFicha.ordem == criar.ordem))
    
    if verificar_ordem:
        raise HTTPException(
            status_code=409,
            detail="Já existe um exercício com esta ordem neste treino"
        )
    
    item = ItemFicha(
        ficha_id = ficha.id,
        treino_id = treino.id,
        exercicio_id = criar.exercicio_id,
        series = criar.series,
        repeticoes = criar.repeticoes,
        carga = criar.carga,
        descanso = criar.descanso,
        ordem = criar.ordem,
        ativo=True
    )
        
    db.add(item)
    db.commit()
    db.refresh(item)

    return item

@router.get("/ficha/{id}", response_model=FichaCompletaResposta)
def ficha_aluno(id: int, aluno=Depends(verificar_aluno), db: Session = Depends(get_db)):

    ficha = db.scalar(
        select(Ficha).where(Ficha.id == id, Ficha.ativo.is_(True)))

    if not ficha:
        raise HTTPException(
            status_code=404,
            detail="Ficha não encontrada"
        )
    
    if ficha.aluno_id != aluno.id:
         raise HTTPException(
            status_code=404,
            detail="Ficha não encontrada"
        )
    
    ativos = db.scalars(
        select(Treino).where(Treino.ficha_id == ficha.id, Treino.ativo.is_(True)).order_by(Treino.ordem)).all()

    for treino in ativos:

        itemficha = db.scalars(
        select(ItemFicha).where(ItemFicha.treino_id == treino.id, ItemFicha.ativo.is_(True)).order_by(ItemFicha.ordem)).all()

        treino.itens = itemficha

    ficha.treinos = ativos 
    
    return ficha

@router.put("/ficha/{id}", response_model=FichaResposta)
def atualizar_ficha(id: int, dados: AtualizarFicha, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    ficha = db.scalar(
        select(Ficha).where(Ficha.id == id, Ficha.ativo.is_(True)))

    if not ficha:
        raise HTTPException(
            status_code=404,
            detail="Ficha de treino não encontrada"
        )

    if ficha.professor_id != professor.id:
        raise HTTPException(
            status_code=403,
            detail="Você não tem permissão para alterar esta ficha de treino"
        )

    ficha.nome = dados.nome

    db.commit()
    db.refresh(ficha)

    return ficha

@router.put("/ficha/item/{id}", response_model=ItemFichaResposta)
def atualizar_itens_ficha(id: int, dados: AtualizarItemFicha, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    item_ficha = db.scalar(
        select(ItemFicha).where(ItemFicha.id == id, ItemFicha.ativo.is_(True)))

    if not item_ficha:
        raise HTTPException(
            status_code=404,
            detail="Item da ficha não encontrado"
        )

    ficha = db.scalar(
        select(Ficha).where(Ficha.id == item_ficha.ficha_id, Ficha.ativo.is_(True)))
    
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
        select(ItemFicha).where(ItemFicha.treino_id == item_ficha.treino_id, ItemFicha.ativo.is_(True), ItemFicha.ordem == dados.ordem, ItemFicha.id != id))
    
    if verificar_ordem:
        raise HTTPException(
            status_code=409,
            detail="Já existe um exercício com esta ordem neste treino"
        )

    item_ficha.series = dados.series
    item_ficha.repeticoes = dados.repeticoes
    item_ficha.carga = dados.carga
    item_ficha.descanso = dados.descanso
    item_ficha.ordem = dados.ordem

    db.commit()
    db.refresh(item_ficha)

    return item_ficha

@router.delete("/ficha/item/{id}")
def deletar_item_ficha(id: int, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    item_ficha = db.scalar(
        select(ItemFicha).where(ItemFicha.id == id, ItemFicha.ativo.is_(True)))

    if not item_ficha:
        raise HTTPException(
            status_code=404,
            detail="Item da ficha não encontrado"
        )
    
    ficha = db.scalar(
        select(Ficha).where(Ficha.id == item_ficha.ficha_id))
    
    if not ficha:
        raise HTTPException(
            status_code=404,
            detail="Ficha não encontrada"
        )   

    if ficha.professor_id != professor.id:
        raise HTTPException(
            status_code=403,
            detail="Você não tem permissão para excluir este item"
        )

    if item_ficha.historicos:
        item_ficha.ativo = False
    else:
        db.delete(item_ficha)
    
    db.commit()

    return {
        "mensagem": "Item da ficha excluído com sucesso"
    }

@router.delete("/ficha/{id}")
def deletar_ficha(id: int, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    ficha = db.scalar(
        select(Ficha).where(Ficha.id == id, Ficha.ativo.is_(True)))

    if not ficha:
        raise HTTPException(
            status_code=404,
            detail="Ficha não encontrada"
        )

    if ficha.professor_id != professor.id:
        raise HTTPException(
            status_code=403,
            detail="Você não tem permissão para excluir esta ficha"
        )
    
    treinos = db.scalars(
    select(Treino).where(Treino.ficha_id == ficha.id, Treino.ativo.is_(True))).all()

    for treino in treinos:
        itens = db.scalars(
        select(ItemFicha).where(ItemFicha.treino_id == treino.id, ItemFicha.ativo.is_(True))).all()

        for item in itens:
            item.ativo = False
        
        treino.ativo = False
    ficha.ativo = False
    db.commit()

    return {
        "mensagem": "Ficha excluída com sucesso"
    }

@router.get("/ficha/aluno", response_model=list[FichaResposta])
def fichas(aluno=Depends(verificar_aluno), db: Session = Depends(get_db)):

    fichas = db.scalars(
        select(Ficha).where(Ficha.aluno_id == aluno.id, Ficha.ativo.is_(True))).all()

    if not fichas:
        raise HTTPException(
            status_code=404,
            detail="Você não possui fichas de treino ativas"
        )
    
    return fichas
  
@router.post("/ficha/treino")
def treino_realizado(dados: ExecucaoHistorico, aluno=Depends(verificar_aluno), db: Session = Depends(get_db)):

    item_ficha = db.scalar(select(ItemFicha).where(ItemFicha.id == dados.item_ficha_id,
    ItemFicha.ativo.is_(True)))

    if not item_ficha:
        raise HTTPException(
            status_code=404,
            detail="Item da ficha não encontrado"
        )
    
    treino = db.scalar(
    select(Treino).where(Treino.id == item_ficha.treino_id, Treino.ativo.is_(True)))

    if not treino:
        raise HTTPException(
            status_code=404,
            detail="Treino não encontrado"
        )

    ficha = db.scalar(select(Ficha).where(Ficha.id == item_ficha.ficha_id, 
    Ficha.aluno_id == aluno.id, Ficha.ativo.is_(True)))
    
    if not ficha:
        raise HTTPException(
            status_code=404,
            detail="Ficha não encontrada"
        )

    registrar_treino = HistoricoExecucao(
        item_ficha_id=dados.item_ficha_id,
        aluno_id=aluno.id,
        carga_utilizada=dados.carga_utilizada,
        repeticoes_realizadas=dados.repeticoes_realizadas,
        series_realizadas=dados.series_realizadas,
        observacao=dados.observacao,
        data_execucao=dados.data_execucao
    )
    
    
    db.add(registrar_treino)
    db.commit()
    db.refresh(registrar_treino)

    return {"mensagem": "treino registrado com sucesso"}

@router.get("/ficha/progresso", response_model=list[HistoricoResposta])
def historico_progresso(aluno=Depends(verificar_aluno), db: Session = Depends(get_db)):

    historicos = db.scalars(
        select(HistoricoExecucao).where(HistoricoExecucao.aluno_id == aluno.id).order_by(HistoricoExecucao.data_execucao.desc())).all()

    if not historicos:
        raise HTTPException(
            status_code=404,
            detail="Você não possui histórico de treino"
        )
    
    return historicos

@router.get("/ficha/itens/treino/{treino_id}", response_model=list[ItemFichaResposta])
def listar_exercicios(treino_id: int, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

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
            detail="Você não tem permissão para visualizar este treino"
        )

    itens = db.scalars(
        select(ItemFicha).where(ItemFicha.treino_id == treino_id,ItemFicha.ativo.is_(True)).order_by(ItemFicha.ordem)).all()

    if not itens:
        raise HTTPException(
            status_code=404,
            detail="Nenhum exercício cadastrado neste treino"
        )

    return itens