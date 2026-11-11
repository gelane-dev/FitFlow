from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..core.seguranca import verificar_aluno, verificar_professor_ou_admin
from ..schemas.evolucao import EvolucaoExercicioResumo, EvolucaoExercicio, PeriodoEvolucao
from ..services import evolucao as servico
from ..services.acesso_aluno import obter_aluno_acessivel

router = APIRouter()

@router.get("/evolucao/exercicios", response_model=list[EvolucaoExercicioResumo])
def listar_evolucao(aluno=Depends(verificar_aluno), db: Session = Depends(get_db)):

    return servico.resumo_exercicios(db, aluno.id)

@router.get("/evolucao/exercicios/{exercicio_id}", response_model=EvolucaoExercicio)
def evolucao_do_exercicio(exercicio_id: int, periodo: PeriodoEvolucao | None = Query(None), aluno=Depends(verificar_aluno), db: Session = Depends(get_db)):

    return servico.evolucao_exercicio(db, aluno.id, exercicio_id, periodo)

@router.get("/alunos/{aluno_id}/evolucao/exercicios", response_model=list[EvolucaoExercicioResumo])
def listar_evolucao_do_aluno(aluno_id: int, ator=Depends(verificar_professor_ou_admin), db: Session = Depends(get_db)):

    aluno = obter_aluno_acessivel(db, ator, aluno_id)

    return servico.resumo_exercicios(db, aluno.id)

@router.get("/alunos/{aluno_id}/evolucao/exercicios/{exercicio_id}", response_model=EvolucaoExercicio)
def evolucao_do_exercicio_do_aluno(aluno_id: int, exercicio_id: int, periodo: PeriodoEvolucao | None = Query(None), ator=Depends(verificar_professor_ou_admin), db: Session = Depends(get_db)):

    aluno = obter_aluno_acessivel(db, ator, aluno_id)

    return servico.evolucao_exercicio(db, aluno.id, exercicio_id, periodo)
