from datetime import date, datetime, time, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.seguranca import exigir_papeis, exigir_permissao
from ..core.tempo import hoje
from ..database import get_db
from ..models import Aluno, Pagamento
from ..schemas.pagamento import (
    ComprovanteResposta, PagamentoAvulso, PagamentoEstornar, PagamentoRegistrar, PagamentoResposta,
)
from ..services import pagamentos as servico
from ..services.configuracao import obter_configuracao
from ..services.equipe import nomes_usuarios
from ..services.paginacao import Pagina, ParametrosPagina, montar_pagina, paginar

router = APIRouter()

qualquer_recepcao = exigir_papeis("admin", "recepcao")


def _responder(db: Session, pagamento: Pagamento) -> dict:
    return servico.resposta_pagamento(pagamento, db.get(Aluno, pagamento.aluno_id))


@router.get("/pagamentos", response_model=Pagina[PagamentoResposta])
def listar_pagamentos(
    status: Literal["pendente", "pago", "estornado", "cancelado"] | None = None,
    aluno_id: int | None = None,
    inicio: date | None = None,
    fim: date | None = None,
    inadimplentes: bool = False,
    parametros: ParametrosPagina = Depends(),
    usuario=Depends(qualquer_recepcao),
    db: Session = Depends(get_db),
):
    consulta = (
        select(Pagamento, Aluno).join(Aluno, Aluno.id == Pagamento.aluno_id)
        .order_by(Pagamento.vencimento.desc(), Pagamento.id.desc())
    )

    if status:
        consulta = consulta.where(Pagamento.status == status)
    if aluno_id is not None:
        consulta = consulta.where(Pagamento.aluno_id == aluno_id)
    if inicio:
        consulta = consulta.where(Pagamento.vencimento >= inicio)
    if fim:
        consulta = consulta.where(Pagamento.vencimento <= fim)
    if inadimplentes:
        consulta = consulta.where(Pagamento.status == "pendente", Pagamento.vencimento < hoje())

    linhas, total = paginar(db, consulta, parametros)

    return montar_pagina([servico.resposta_pagamento(p, a) for p, a in linhas], total, parametros)


@router.post("/pagamentos", response_model=PagamentoResposta)
def registrar_pagamento_avulso(
    dados: PagamentoAvulso, usuario=Depends(exigir_permissao("registrar_pagamento")), db: Session = Depends(get_db),
):
    pagamento = servico.registrar_avulso(db, usuario, dados.aluno_id, dados.descricao, dados.valor, dados.forma)
    db.commit()

    return _responder(db, pagamento)


@router.post("/pagamentos/{pagamento_id}/registrar", response_model=PagamentoResposta)
def registrar_recebimento(
    pagamento_id: int, dados: PagamentoRegistrar,
    usuario=Depends(exigir_permissao("registrar_pagamento")), db: Session = Depends(get_db),
):
    pagamento = servico.registrar_recebimento(
        db, usuario, pagamento_id, dados.forma, dados.valor_recebido, dados.pago_em
    )
    db.commit()

    return _responder(db, pagamento)


@router.post("/pagamentos/{pagamento_id}/estornar", response_model=PagamentoResposta)
def estornar_pagamento(
    pagamento_id: int, dados: PagamentoEstornar,
    usuario=Depends(exigir_permissao("estornar_pagamento")), db: Session = Depends(get_db),
):
    pagamento = servico.estornar(db, usuario, pagamento_id, dados.motivo)
    db.commit()

    return _responder(db, pagamento)


@router.get("/pagamentos/{pagamento_id}/comprovante", response_model=ComprovanteResposta)
def comprovante(pagamento_id: int, usuario=Depends(qualquer_recepcao), db: Session = Depends(get_db)):

    pagamento = servico.obter_pagamento(db, pagamento_id)

    if pagamento.status not in ("pago", "estornado"):
        raise HTTPException(status_code=409, detail="Pagamento sem comprovante")

    aluno = db.get(Aluno, pagamento.aluno_id)
    configuracao = obter_configuracao(db)
    responsavel = pagamento.registrado_por_user_id
    nomes = nomes_usuarios(db, {responsavel}) if responsavel else {}

    return {
        "numero": f"{pagamento.id:06d}",
        "status": pagamento.status,
        "aluno": {"id": aluno.id, "nome": aluno.nome},
        "descricao": pagamento.descricao,
        "valor": pagamento.valor,
        "valor_recebido": pagamento.valor_recebido,
        "forma": pagamento.forma,
        "pago_em": pagamento.pago_em,
        "registrado_por": nomes.get(responsavel),
        "academia": {
            "nome": configuracao.nome, "endereco": configuracao.endereco, "telefone": configuracao.telefone,
        },
    }
