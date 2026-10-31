from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..core.seguranca import verificar_aluno, verificar_professor, verificar_aluno_ou_professor
from ..models import Aluno
from ..schemas.ficha import HistoricoResposta
from ..schemas.sessao import (
    SessaoCriar, SessaoResposta, SessaoResumo, ExecucoesCriar, SessaoFinalizar,
)
from ..services import sessoes as servico

router = APIRouter()

@router.post("/sessoes", response_model=SessaoResposta)
def iniciar_sessao(dados: SessaoCriar, aluno=Depends(verificar_aluno), db: Session = Depends(get_db)):

    sessao = servico.iniciar_sessao(db, aluno, dados.treino_id)

    return servico.montar_sessao(sessao)

@router.post("/sessoes/{id}/execucoes", response_model=list[HistoricoResposta])
def registrar_execucoes(id: int, dados: ExecucoesCriar, aluno=Depends(verificar_aluno), db: Session = Depends(get_db)):

    sessao = servico.buscar_sessao_do_aluno(db, id, aluno)

    return servico.registrar_execucoes(db, sessao, aluno, dados.execucoes)

@router.post("/sessoes/{id}/finalizar", response_model=SessaoResposta)
def finalizar_sessao(id: int, dados: SessaoFinalizar | None = None, aluno=Depends(verificar_aluno), db: Session = Depends(get_db)):

    dados = dados or SessaoFinalizar()
    sessao = servico.buscar_sessao_do_aluno(db, id, aluno)
    sessao = servico.finalizar_sessao(db, sessao, dados.esforco, dados.comentario)

    return servico.montar_sessao(sessao)

@router.get("/sessoes", response_model=list[SessaoResumo])
def listar_sessoes(
    limite: int | None = Query(None, ge=1, le=200),
    deslocamento: int = Query(0, ge=0),
    aluno=Depends(verificar_aluno),
    db: Session = Depends(get_db),
):

    return servico.listar_sessoes_aluno(db, aluno.id, limite, deslocamento)

@router.get("/sessoes/{id}", response_model=SessaoResposta)
def obter_sessao(id: int, perfil=Depends(verificar_aluno_ou_professor), db: Session = Depends(get_db)):

    tipo, usuario_perfil = perfil

    sessao = servico.carregar_sessao(db, id)

    if not sessao:
        raise HTTPException(
            status_code=404,
            detail="Sessão não encontrada"
        )

    if tipo == "aluno" and sessao.aluno_id != usuario_perfil.id:
        # Não revela a existência de sessões de outros alunos
        raise HTTPException(
            status_code=404,
            detail="Sessão não encontrada"
        )

    return servico.montar_sessao(sessao)

@router.get("/alunos/{aluno_id}/sessoes", response_model=list[SessaoResumo])
def listar_sessoes_do_aluno(
    aluno_id: int,
    limite: int | None = Query(None, ge=1, le=200),
    deslocamento: int = Query(0, ge=0),
    professor=Depends(verificar_professor),
    db: Session = Depends(get_db),
):

    aluno = db.scalar(select(Aluno).where(Aluno.id == aluno_id))

    if not aluno:
        raise HTTPException(
            status_code=404,
            detail="Aluno não encontrado"
        )

    return servico.listar_sessoes_aluno(db, aluno.id, limite, deslocamento)
