"""Pagamentos: recebimento, avulso, estorno."""
from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..core.tempo import agora_naive, hoje, para_naive_local
from ..models import Aluno, Pagamento, User
from . import auditoria


def obter_pagamento(db: Session, pagamento_id: int, travar: bool = False) -> Pagamento:
    """`travar` lê com FOR UPDATE: dois recebimentos/estornos simultâneos não duplicam a auditoria."""
    pagamento = db.get(Pagamento, pagamento_id, with_for_update=travar or None)
    if not pagamento:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    return pagamento


def resposta_pagamento(pagamento: Pagamento, aluno: Aluno) -> dict:
    return {
        "id": pagamento.id,
        "aluno": {"id": aluno.id, "nome": aluno.nome},
        "matricula_id": pagamento.matricula_id,
        "descricao": pagamento.descricao,
        "valor": pagamento.valor,
        "vencimento": pagamento.vencimento,
        "status": pagamento.status,
        "vencido": pagamento.status == "pendente" and pagamento.vencimento < hoje(),
        "forma": pagamento.forma,
        "valor_recebido": pagamento.valor_recebido,
        "pago_em": pagamento.pago_em,
        "registrado_por_user_id": pagamento.registrado_por_user_id,
        "motivo_estorno": pagamento.motivo_estorno,
        "estornado_em": pagamento.estornado_em,
        "criado_em": pagamento.criado_em,
    }


def registrar_recebimento(
    db: Session, usuario: User, pagamento_id: int, forma: str,
    valor_recebido: Decimal | None, pago_em: datetime | None,
) -> Pagamento:
    pagamento = obter_pagamento(db, pagamento_id, travar=True)

    if pagamento.status != "pendente":
        raise HTTPException(status_code=409, detail="Pagamento não está pendente")

    pagamento.status = "pago"
    pagamento.forma = forma
    pagamento.valor_recebido = valor_recebido if valor_recebido is not None else pagamento.valor
    pagamento.pago_em = para_naive_local(pago_em) if pago_em else agora_naive()
    pagamento.registrado_por_user_id = usuario.id

    auditoria.registrar(
        db, usuario, "pagamento.registrar", "pagamento", pagamento.id,
        f"Recebimento de {pagamento.descricao}",
        {"aluno_id": pagamento.aluno_id, "forma": forma, "valor_recebido": str(pagamento.valor_recebido)},
    )
    return pagamento


def registrar_avulso(
    db: Session, usuario: User, aluno_id: int, descricao: str, valor: Decimal, forma: str,
) -> Pagamento:
    aluno = db.get(Aluno, aluno_id)
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    agora = agora_naive()
    pagamento = Pagamento(
        aluno_id=aluno.id, matricula_id=None, descricao=descricao, valor=valor, vencimento=agora.date(),
        status="pago", forma=forma, valor_recebido=valor, pago_em=agora, registrado_por_user_id=usuario.id,
    )
    db.add(pagamento)
    db.flush()

    auditoria.registrar(
        db, usuario, "pagamento.avulso", "pagamento", pagamento.id,
        f"Pagamento avulso de {aluno.nome}: {descricao}",
        {"aluno_id": aluno.id, "forma": forma, "valor": str(valor)},
    )
    return pagamento


def estornar(db: Session, usuario: User, pagamento_id: int, motivo: str) -> Pagamento:
    pagamento = obter_pagamento(db, pagamento_id, travar=True)

    if pagamento.status != "pago":
        raise HTTPException(status_code=409, detail="Pagamento não está pago")

    pagamento.status = "estornado"
    pagamento.motivo_estorno = motivo
    pagamento.estornado_em = agora_naive()
    pagamento.estornado_por_user_id = usuario.id

    auditoria.registrar(
        db, usuario, "pagamento.estornar", "pagamento", pagamento.id,
        f"Estorno de {pagamento.descricao}",
        {"aluno_id": pagamento.aluno_id, "motivo": motivo},
    )
    return pagamento
