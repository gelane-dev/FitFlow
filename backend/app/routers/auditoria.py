from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.seguranca import verificar_admin
from ..database import get_db
from ..schemas.auditoria import AuditoriaItem
from ..services import auditoria as servico
from ..services.paginacao import Pagina, ParametrosPagina, montar_pagina, paginar

router = APIRouter()


@router.get("/admin/auditoria", response_model=Pagina[AuditoriaItem])
def listar_auditoria(
    user_id: int | None = None,
    acao: str | None = None,
    entidade: str | None = None,
    entidade_id: int | None = None,
    inicio: date | None = None,
    fim: date | None = None,
    parametros: ParametrosPagina = Depends(),
    admin=Depends(verificar_admin),
    db: Session = Depends(get_db),
):
    consulta = servico.consulta_auditoria(user_id, acao, entidade, entidade_id, inicio, fim)
    linhas, total = paginar(db, consulta, parametros)

    return montar_pagina([servico.para_item(linha) for linha in linhas], total, parametros)
