from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..core.seguranca import exigir_papeis, verificar_professor, verificar_professor_ou_admin
from ..database import get_db
from ..schemas.professor_web import FrequenciaResposta, ProfessorDashboardResposta
from ..services.acesso_aluno import obter_aluno_acessivel
from ..services.frequencia import calcular_frequencia
from ..services.painel_professor import montar_dashboard

router = APIRouter()


@router.get("/professor/dashboard", response_model=ProfessorDashboardResposta)
def dashboard_professor(professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    return montar_dashboard(db, professor)


@router.get("/alunos/{aluno_id}/frequencia", response_model=FrequenciaResposta)
def frequencia_do_aluno(
    aluno_id: int, meses: int = Query(6, ge=1, le=24),
    ator=Depends(verificar_professor_ou_admin), db: Session = Depends(get_db),
):

    aluno = obter_aluno_acessivel(db, ator, aluno_id)

    return calcular_frequencia(db, aluno, meses)


@router.get("/gestao/alunos/{aluno_id}/frequencia", response_model=FrequenciaResposta)
def frequencia_do_aluno_gestao(
    aluno_id: int, meses: int = Query(6, ge=1, le=24),
    usuario=Depends(exigir_papeis("admin", "recepcao")), db: Session = Depends(get_db),
):

    aluno = obter_aluno_acessivel(db, ("admin", usuario), aluno_id)

    return calcular_frequencia(db, aluno, meses)
