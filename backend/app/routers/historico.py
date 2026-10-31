from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..core.seguranca import verificar_aluno
from ..schemas.ficha import ExecucaoHistorico, HistoricoResposta
from ..models import Ficha, ItemFicha, HistoricoExecucao, Treino

router = APIRouter()

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
