from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..core.seguranca import verificar_aluno, verificar_professor
from ..schemas.ficha import ExecucaoHistorico, HistoricoResposta
from ..models import Aluno, Ficha, ItemFicha, HistoricoExecucao, Treino
from ..services.sessoes import buscar_sessao_do_aluno, exigir_sessao_aberta

router = APIRouter()

# exercicio_id/exercicio_nome da resposta saem de item_ficha → exercicio
_com_exercicio = joinedload(HistoricoExecucao.item_ficha).joinedload(ItemFicha.exercicio)

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

    if dados.sessao_id is not None:
        sessao = buscar_sessao_do_aluno(db, dados.sessao_id, aluno)
        exigir_sessao_aberta(sessao)

        if sessao.treino_id != item_ficha.treino_id:
            raise HTTPException(
                status_code=404,
                detail="Item da ficha não encontrado"
            )

    registrar_treino = HistoricoExecucao(
        item_ficha_id=dados.item_ficha_id,
        aluno_id=aluno.id,
        carga_utilizada=dados.carga_utilizada,
        repeticoes_realizadas=dados.repeticoes_realizadas,
        series_realizadas=dados.series_realizadas,
        observacao=dados.observacao,
        data_execucao=dados.data_execucao,
        sessao_id=dados.sessao_id,
    )
    
    
    db.add(registrar_treino)
    db.commit()
    db.refresh(registrar_treino)

    return {"mensagem": "treino registrado com sucesso"}

@router.get("/ficha/progresso", response_model=list[HistoricoResposta])
def historico_progresso(aluno=Depends(verificar_aluno), db: Session = Depends(get_db)):

    historicos = db.scalars(
        select(HistoricoExecucao).options(_com_exercicio).where(HistoricoExecucao.aluno_id == aluno.id).order_by(HistoricoExecucao.data_execucao.desc(), HistoricoExecucao.id.desc())).all()

    return historicos

@router.get("/alunos/{aluno_id}/historico", response_model=list[HistoricoResposta])
def historico_do_aluno(aluno_id: int, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    aluno = db.scalar(select(Aluno).where(Aluno.id == aluno_id))

    if not aluno:
        raise HTTPException(
            status_code=404,
            detail="Aluno não encontrado"
        )

    return db.scalars(
        select(HistoricoExecucao).options(_com_exercicio).where(HistoricoExecucao.aluno_id == aluno.id)
        .order_by(HistoricoExecucao.data_execucao.desc(), HistoricoExecucao.id.desc())).all()
