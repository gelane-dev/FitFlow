from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.seguranca import exigir_papeis, verificar_admin
from ..database import get_db
from ..schemas.painel import DashboardAdmin, DashboardRecepcao, FinanceiroResposta
from ..services import paineis as servico

router = APIRouter()


@router.get("/admin/dashboard", response_model=DashboardAdmin)
def dashboard_admin(admin=Depends(verificar_admin), db: Session = Depends(get_db)):

    return servico.dashboard_admin(db)


@router.get("/recepcao/dashboard", response_model=DashboardRecepcao)
def dashboard_recepcao(usuario=Depends(exigir_papeis("admin", "recepcao")), db: Session = Depends(get_db)):

    return servico.dashboard_recepcao(db)


@router.get("/admin/financeiro", response_model=FinanceiroResposta)
def financeiro(
    inicio: date | None = None, fim: date | None = None,
    admin=Depends(verificar_admin), db: Session = Depends(get_db),
):
    return servico.financeiro(db, inicio, fim)
