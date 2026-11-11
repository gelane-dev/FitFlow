from datetime import date, datetime, time, timedelta
from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.seguranca import exigir_papeis, exigir_permissao
from ..core.tempo import hoje
from ..database import get_db
from ..models import Acesso, Aluno, User
from ..schemas.acesso import AcessoCriar, AcessoResposta, VerificacaoAcessoResposta
from ..services import acessos as servico
from ..services.equipe import nomes_usuarios
from ..services.paginacao import Pagina, ParametrosPagina, montar_pagina, paginar

router = APIRouter()

qualquer_recepcao = exigir_papeis("admin", "recepcao")


@router.get("/acessos/verificar", response_model=VerificacaoAcessoResposta)
def verificar_acesso(
    aluno_id: int | None = None, codigo: str | None = None,
    usuario=Depends(qualquer_recepcao), db: Session = Depends(get_db),
):
    return servico.verificar(db, servico.localizar_aluno(db, aluno_id, codigo))


@router.post("/acessos", response_model=AcessoResposta)
def registrar_acesso(
    dados: AcessoCriar, usuario=Depends(exigir_permissao("registrar_acesso")), db: Session = Depends(get_db),
):
    aluno = servico.localizar_aluno(db, dados.aluno_id, dados.codigo)
    acesso = servico.registrar_entrada(db, usuario, aluno, dados.origem, dados.forcar)
    db.commit()

    return _resposta(db, acesso, aluno, usuario.id)


def _resposta(db: Session, acesso: Acesso, aluno: Aluno, user_id: int, nomes: dict | None = None) -> dict:
    nomes = nomes if nomes is not None else nomes_usuarios(db, {acesso.registrado_por_user_id})
    return {
        "id": acesso.id,
        "aluno": {"id": aluno.id, "nome": aluno.nome, "foto": aluno.user.foto},
        "data_hora": acesso.data_hora,
        "resultado": acesso.resultado,
        "motivos": servico.motivos_detalhados(db, aluno, acesso.motivos or []),
        "origem": acesso.origem,
        "liberacao_manual": acesso.liberacao_manual,
        "registrado_por": nomes.get(acesso.registrado_por_user_id),
    }


@router.get("/acessos", response_model=Pagina[AcessoResposta])
def listar_acessos(
    data: date | None = None,
    aluno_id: int | None = None,
    resultado: Literal["liberado", "bloqueado"] | None = None,
    parametros: ParametrosPagina = Depends(),
    usuario=Depends(qualquer_recepcao),
    db: Session = Depends(get_db),
):
    dia = data or hoje()
    inicio = datetime.combine(dia, time.min)

    consulta = (
        select(Acesso, Aluno).join(Aluno, Aluno.id == Acesso.aluno_id)
        .where(Acesso.data_hora >= inicio, Acesso.data_hora < inicio + timedelta(days=1))
        .order_by(Acesso.data_hora.desc(), Acesso.id.desc())
    )

    if aluno_id is not None:
        consulta = consulta.where(Acesso.aluno_id == aluno_id)
    if resultado:
        consulta = consulta.where(Acesso.resultado == resultado)

    linhas, total = paginar(db, consulta, parametros)
    itens = servico.montar_itens_acesso(db, [(acesso, aluno) for acesso, aluno in linhas])

    return montar_pagina(itens, total, parametros)
