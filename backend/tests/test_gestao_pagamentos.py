"""GA-02a: pagamentos (registrar, avulso, estornar, comprovante, listagem)."""
from datetime import datetime

import pytest

from gestao_fabrica import (
    TODAS_PERMISSOES, criar_aluno, criar_pagamento, criar_recepcao, dias, headers,
)
from app.models import Auditoria, Pagamento
from app.services.configuracao import obter_configuracao


@pytest.fixture
def recepcao(db):
    usuario, perfil = criar_recepcao(db, TODAS_PERMISSOES)
    return headers(usuario)


def _auditoria(db, acao):
    return db.query(Auditoria).filter(Auditoria.acao == acao).all()


# ---------- registrar recebimento ----------

def test_registrar_recebimento_usa_valor_como_padrao(client, db, recepcao):
    pagamento = criar_pagamento(db, criar_aluno(db), "120.50")

    r = client.post(f"/pagamentos/{pagamento.id}/registrar", json={"forma": "pix"}, headers=recepcao)

    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["status"] == "pago" and corpo["forma"] == "pix"
    assert corpo["valor"] == "120.50" and corpo["valor_recebido"] == "120.50"
    assert corpo["pago_em"] is not None and corpo["registrado_por_user_id"] is not None
    registro, = _auditoria(db, "pagamento.registrar")
    assert registro.entidade_id == pagamento.id


def test_registrar_com_valor_e_data_informados(client, db, recepcao):
    pagamento = criar_pagamento(db, criar_aluno(db), "100.00")

    r = client.post(
        f"/pagamentos/{pagamento.id}/registrar", headers=recepcao,
        json={"forma": "dinheiro", "valor_recebido": "90.00", "pago_em": "2026-10-01T10:30:00"},
    )

    assert r.status_code == 200
    db.refresh(pagamento)
    assert str(pagamento.valor_recebido) == "90.00" and str(pagamento.valor) == "100.00"
    assert pagamento.pago_em == datetime(2026, 10, 1, 10, 30)


def test_registrar_so_pendente_409(client, db, recepcao):
    aluno = criar_aluno(db)
    for status in ("pago", "estornado", "cancelado"):
        pagamento = criar_pagamento(db, aluno, status=status)
        r = client.post(f"/pagamentos/{pagamento.id}/registrar", json={"forma": "pix"}, headers=recepcao)
        assert r.status_code == 409 and r.json()["detail"] == "Pagamento não está pendente", status


def test_registrar_validacoes(client, db, recepcao):
    pagamento = criar_pagamento(db, criar_aluno(db))

    for corpo in ({}, {"forma": "cheque"}, {"forma": "pix", "valor_recebido": "0"}, {"forma": "pix", "valor_recebido": "-5"}):
        assert client.post(f"/pagamentos/{pagamento.id}/registrar", json=corpo, headers=recepcao).status_code == 422
    r = client.post("/pagamentos/99999/registrar", json={"forma": "pix"}, headers=recepcao)
    assert r.status_code == 404 and r.json()["detail"] == "Pagamento não encontrado"
    db.refresh(pagamento)
    assert pagamento.status == "pendente"


# ---------- avulso ----------

def test_pagamento_avulso_nasce_pago(client, db, recepcao):
    aluno = criar_aluno(db)

    r = client.post("/pagamentos", json={"aluno_id": aluno.id, "descricao": "Garrafa", "valor": "25.00", "forma": "cartao_debito"}, headers=recepcao)

    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["status"] == "pago" and corpo["valor_recebido"] == "25.00" and corpo["matricula_id"] is None
    assert corpo["forma"] == "cartao_debito" and corpo["descricao"] == "Garrafa" and corpo["pago_em"]
    assert len(_auditoria(db, "pagamento.avulso")) == 1


def test_pagamento_avulso_validacoes(client, db, recepcao):
    aluno = criar_aluno(db)
    base = {"aluno_id": aluno.id, "descricao": "x", "valor": "10.00", "forma": "pix"}

    for ruim in ({**base, "valor": "0"}, {**base, "valor": "-1"}, {**base, "descricao": ""},
                 {**base, "descricao": "   "}, {**base, "forma": "boleto"}):
        assert client.post("/pagamentos", json=ruim, headers=recepcao).status_code == 422
    r = client.post("/pagamentos", json={**base, "aluno_id": 99999}, headers=recepcao)
    assert r.status_code == 404 and r.json()["detail"] == "Aluno não encontrado"
    assert db.query(Pagamento).count() == 0


# ---------- estorno ----------

def test_estornar_so_pago_com_motivo(client, db, recepcao):
    aluno = criar_aluno(db)
    pago = criar_pagamento(db, aluno, status="pago", forma="pix")
    pendente = criar_pagamento(db, aluno)

    assert client.post(f"/pagamentos/{pago.id}/estornar", json={"motivo": ""}, headers=recepcao).status_code == 422
    assert client.post(f"/pagamentos/{pago.id}/estornar", json={}, headers=recepcao).status_code == 422

    r = client.post(f"/pagamentos/{pago.id}/estornar", json={"motivo": "Cobrança duplicada"}, headers=recepcao)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "estornado" and r.json()["motivo_estorno"] == "Cobrança duplicada"
    assert r.json()["estornado_em"] is not None
    assert db.query(Pagamento).count() == 2  # nunca apaga
    registro, = _auditoria(db, "pagamento.estornar")
    assert registro.detalhes["motivo"] == "Cobrança duplicada"

    for alvo in (pendente, pago):
        r = client.post(f"/pagamentos/{alvo.id}/estornar", json={"motivo": "x"}, headers=recepcao)
        assert r.status_code == 409 and r.json()["detail"] == "Pagamento não está pago"
    assert client.post("/pagamentos/99999/estornar", json={"motivo": "x"}, headers=recepcao).status_code == 404


# ---------- comprovante ----------

def test_comprovante_de_pago_e_estornado(client, db, recepcao):
    configuracao = obter_configuracao(db)
    configuracao.nome, configuracao.endereco, configuracao.telefone = "Academia Teste", "Rua 1", "1133334444"
    db.commit()
    aluno = criar_aluno(db, "Comprador")
    pagamento = criar_pagamento(db, aluno, "80.00")
    client.post(f"/pagamentos/{pagamento.id}/registrar", json={"forma": "pix", "valor_recebido": "75.00"}, headers=recepcao)

    r = client.get(f"/pagamentos/{pagamento.id}/comprovante", headers=recepcao)

    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["numero"] == f"{pagamento.id:06d}" and corpo["status"] == "pago"
    assert corpo["aluno"]["nome"] == "Comprador" and corpo["valor"] == "80.00" and corpo["valor_recebido"] == "75.00"
    assert corpo["forma"] == "pix" and corpo["pago_em"] and corpo["registrado_por"] == "Recepção Um"
    assert corpo["academia"] == {"nome": "Academia Teste", "endereco": "Rua 1", "telefone": "1133334444"}

    client.post(f"/pagamentos/{pagamento.id}/estornar", json={"motivo": "erro"}, headers=recepcao)
    assert client.get(f"/pagamentos/{pagamento.id}/comprovante", headers=recepcao).json()["status"] == "estornado"


def test_comprovante_so_de_pago_ou_estornado(client, db, recepcao):
    aluno = criar_aluno(db)
    for status in ("pendente", "cancelado"):
        pagamento = criar_pagamento(db, aluno, status=status)
        r = client.get(f"/pagamentos/{pagamento.id}/comprovante", headers=recepcao)
        assert r.status_code == 409 and r.json()["detail"] == "Pagamento sem comprovante"
    assert client.get("/pagamentos/99999/comprovante", headers=recepcao).status_code == 404


# ---------- listagem ----------

def test_listagem_filtros_e_paginacao(client, db, recepcao):
    a, b = criar_aluno(db, "Aa"), criar_aluno(db, "Bb")
    atrasado = criar_pagamento(db, a, "10.00", dias(-5))
    futuro = criar_pagamento(db, a, "20.00", dias(10))
    pago = criar_pagamento(db, b, "30.00", dias(-2), status="pago")
    cancelado = criar_pagamento(db, b, "40.00", dias(-40), status="cancelado")

    def ids(consulta):
        r = client.get(f"/pagamentos?{consulta}", headers=recepcao)
        assert r.status_code == 200
        return {i["id"] for i in r.json()["itens"]}

    assert ids("") == {atrasado.id, futuro.id, pago.id, cancelado.id}
    assert ids("status=pendente") == {atrasado.id, futuro.id}
    assert ids("status=pago") == {pago.id}
    assert ids(f"aluno_id={b.id}") == {pago.id, cancelado.id}
    assert ids("inadimplentes=true") == {atrasado.id}
    assert ids(f"inicio={dias(-10)}&fim={dias(0)}") == {atrasado.id, pago.id}
    assert ids(f"inicio={dias(1)}") == {futuro.id}

    item = client.get(f"/pagamentos?aluno_id={a.id}&status=pendente", headers=recepcao).json()["itens"]
    assert [(i["id"], i["vencido"]) for i in item] == [(futuro.id, False), (atrasado.id, True)]  # vencimento desc

    pagina = client.get("/pagamentos?por_pagina=3&pagina=2", headers=recepcao).json()
    assert pagina["total"] == 4 and len(pagina["itens"]) == 1
    assert client.get("/pagamentos?status=xyz", headers=recepcao).status_code == 422
