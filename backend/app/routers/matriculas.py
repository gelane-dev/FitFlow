from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.seguranca import exigir_papeis, exigir_permissao
from ..core.tempo import hoje
from ..database import get_db
from ..models import Aluno, Matricula, Plano
from ..schemas.matricula import (
    MatriculaAlterarPlano, MatriculaCancelar, MatriculaCriar, MatriculaRenovar, MatriculaResposta,
)
from ..services import matriculas as servico
from ..services.paginacao import Pagina, ParametrosPagina, montar_pagina, paginar

router = APIRouter()

qualquer_recepcao = exigir_papeis("admin", "recepcao")


def _responder(db: Session, matricula: Matricula) -> dict:
    return servico.resposta_matricula(
        matricula, db.get(Aluno, matricula.aluno_id), db.get(Plano, matricula.plano_id),
        hoje(), servico.dias_alerta_vencimento(db),
    )


@router.get("/matriculas", response_model=Pagina[MatriculaResposta])
def listar_matriculas(
    aluno_id: int | None = None,
    status: Literal["ativa", "encerrada", "substituida", "cancelada"] | None = None,
    situacao: Literal["vigente", "vencendo", "vencida"] | None = None,
    plano_id: int | None = None,
    parametros: ParametrosPagina = Depends(),
    usuario=Depends(qualquer_recepcao),
    db: Session = Depends(get_db),
):
    alerta = servico.dias_alerta_vencimento(db)
    referencia = hoje()

    consulta = (
        select(Matricula, Aluno, Plano)
        .join(Aluno, Aluno.id == Matricula.aluno_id).join(Plano, Plano.id == Matricula.plano_id)
        .order_by(Matricula.criado_em.desc(), Matricula.id.desc())
    )

    if aluno_id is not None:
        consulta = consulta.where(Matricula.aluno_id == aluno_id)
    if status:
        consulta = consulta.where(Matricula.status == status)
    if plano_id is not None:
        consulta = consulta.where(Matricula.plano_id == plano_id)
    if situacao:
        consulta = consulta.where(servico.filtro_situacao_matricula(situacao, referencia, alerta))

    linhas, total = paginar(db, consulta, parametros)
    itens = [servico.resposta_matricula(m, a, p, referencia, alerta) for m, a, p in linhas]

    return montar_pagina(itens, total, parametros)


@router.post("/matriculas", response_model=MatriculaResposta)
def criar_matricula(
    dados: MatriculaCriar, usuario=Depends(exigir_permissao("matricular")), db: Session = Depends(get_db),
):
    matricula = servico.matricular(db, usuario, dados.aluno_id, dados.plano_id, dados.data_inicio)
    db.commit()

    return _responder(db, matricula)


@router.post("/matriculas/{matricula_id}/renovar", response_model=MatriculaResposta)
def renovar_matricula(
    matricula_id: int, dados: MatriculaRenovar | None = None,
    usuario=Depends(exigir_permissao("renovar_matricula")), db: Session = Depends(get_db),
):
    nova = servico.renovar(db, usuario, matricula_id, dados.plano_id if dados else None)
    db.commit()

    return _responder(db, nova)


@router.post("/matriculas/{matricula_id}/alterar-plano", response_model=MatriculaResposta)
def alterar_plano_da_matricula(
    matricula_id: int, dados: MatriculaAlterarPlano,
    usuario=Depends(exigir_permissao("alterar_plano")), db: Session = Depends(get_db),
):
    nova = servico.alterar_plano(db, usuario, matricula_id, dados.plano_id)
    db.commit()

    return _responder(db, nova)


@router.post("/matriculas/{matricula_id}/cancelar", response_model=MatriculaResposta)
def cancelar_matricula(
    matricula_id: int, dados: MatriculaCancelar,
    usuario=Depends(exigir_permissao("cancelar_matricula")), db: Session = Depends(get_db),
):
    matricula = servico.cancelar(db, usuario, matricula_id, dados.motivo)
    db.commit()

    return _responder(db, matricula)
