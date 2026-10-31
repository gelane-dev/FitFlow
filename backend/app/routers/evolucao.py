from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..core.seguranca import verificar_aluno, verificar_professor
from ..models import Aluno
from ..schemas.evolucao import EvolucaoExercicioResumo, EvolucaoExercicio
from ..services import evolucao as servico

router = APIRouter()

@router.get("/evolucao/exercicios", response_model=list[EvolucaoExercicioResumo])
def listar_evolucao(aluno=Depends(verificar_aluno), db: Session = Depends(get_db)):

    return servico.resumo_exercicios(db, aluno.id)

@router.get("/evolucao/exercicios/{exercicio_id}", response_model=EvolucaoExercicio)
def evolucao_do_exercicio(exercicio_id: int, aluno=Depends(verificar_aluno), db: Session = Depends(get_db)):

    return servico.evolucao_exercicio(db, aluno.id, exercicio_id)

def _buscar_aluno(db: Session, aluno_id: int) -> Aluno:
    aluno = db.scalar(select(Aluno).where(Aluno.id == aluno_id))

    if not aluno:
        raise HTTPException(
            status_code=404,
            detail="Aluno não encontrado"
        )

    return aluno

@router.get("/alunos/{aluno_id}/evolucao/exercicios", response_model=list[EvolucaoExercicioResumo])
def listar_evolucao_do_aluno(aluno_id: int, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    aluno = _buscar_aluno(db, aluno_id)

    return servico.resumo_exercicios(db, aluno.id)

@router.get("/alunos/{aluno_id}/evolucao/exercicios/{exercicio_id}", response_model=EvolucaoExercicio)
def evolucao_do_exercicio_do_aluno(aluno_id: int, exercicio_id: int, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    aluno = _buscar_aluno(db, aluno_id)

    return servico.evolucao_exercicio(db, aluno.id, exercicio_id)
