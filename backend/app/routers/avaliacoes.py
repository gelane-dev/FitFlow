from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..core.seguranca import verificar_aluno, verificar_professor
from ..models import Aluno, AvaliacaoFisica
from ..schemas.avaliacao import AvaliacaoCriar, AvaliacaoResposta
from ..services.avaliacoes import montar_avaliacao

router = APIRouter()

def _buscar_avaliacao(db: Session, id: int, professor, acao: str) -> AvaliacaoFisica:
    avaliacao = db.scalar(select(AvaliacaoFisica).where(AvaliacaoFisica.id == id))

    if not avaliacao:
        raise HTTPException(
            status_code=404,
            detail="Avaliação não encontrada"
        )

    if avaliacao.professor_id != professor.id:
        raise HTTPException(
            status_code=403,
            detail=f"Você não tem permissão para {acao} esta avaliação"
        )

    return avaliacao

@router.post("/alunos/{aluno_id}/avaliacoes", response_model=AvaliacaoResposta)
def criar_avaliacao(aluno_id: int, dados: AvaliacaoCriar, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    aluno = db.scalar(select(Aluno).where(Aluno.id == aluno_id))

    if not aluno:
        raise HTTPException(
            status_code=404,
            detail="Aluno não encontrado"
        )

    avaliacao = AvaliacaoFisica(aluno_id=aluno.id, professor_id=professor.id, **dados.model_dump())

    db.add(avaliacao)
    db.commit()
    db.refresh(avaliacao)

    return montar_avaliacao(avaliacao)

@router.get("/alunos/{aluno_id}/avaliacoes", response_model=list[AvaliacaoResposta])
def listar_avaliacoes_do_aluno(aluno_id: int, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    aluno = db.scalar(select(Aluno).where(Aluno.id == aluno_id))

    if not aluno:
        raise HTTPException(
            status_code=404,
            detail="Aluno não encontrado"
        )

    avaliacoes = db.scalars(
        select(AvaliacaoFisica).where(AvaliacaoFisica.aluno_id == aluno.id)
        .order_by(AvaliacaoFisica.data_avaliacao.desc(), AvaliacaoFisica.id.desc())).all()

    return [montar_avaliacao(a) for a in avaliacoes]

@router.get("/avaliacoes", response_model=list[AvaliacaoResposta])
def listar_minhas_avaliacoes(aluno=Depends(verificar_aluno), db: Session = Depends(get_db)):

    avaliacoes = db.scalars(
        select(AvaliacaoFisica).where(AvaliacaoFisica.aluno_id == aluno.id)
        .order_by(AvaliacaoFisica.data_avaliacao.desc(), AvaliacaoFisica.id.desc())).all()

    return [montar_avaliacao(a) for a in avaliacoes]

@router.put("/avaliacoes/{id}", response_model=AvaliacaoResposta)
def atualizar_avaliacao(id: int, dados: AvaliacaoCriar, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    avaliacao = _buscar_avaliacao(db, id, professor, "alterar")

    for campo, valor in dados.model_dump().items():
        setattr(avaliacao, campo, valor)

    db.commit()
    db.refresh(avaliacao)

    return montar_avaliacao(avaliacao)

@router.delete("/avaliacoes/{id}")
def deletar_avaliacao(id: int, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    avaliacao = _buscar_avaliacao(db, id, professor, "excluir")

    db.delete(avaliacao)
    db.commit()

    return {"mensagem": "Avaliação excluída com sucesso"}
