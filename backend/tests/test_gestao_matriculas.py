"""GA-02a: matrículas (matricular, renovar, alterar plano, cancelar, listagem) e pagamentos gerados."""
from datetime import timedelta

import pytest

from gestao_fabrica import (
    TODAS_PERMISSOES, criar_aluno, criar_matricula, criar_pagamento, criar_plano, criar_recepcao, dias, headers,
)
from app.core.tempo import hoje
from app.models import Auditoria, Matricula, Pagamento


@pytest.fixture
def recepcao(db):
    usuario, _ = criar_recepcao(db, TODAS_PERMISSOES)
    return headers(usuario)


def _auditoria(db, acao):
    return db.query(Auditoria).filter(Auditoria.acao == acao).all()


def _pagamentos(db, aluno):
    return db.query(Pagamento).filter(Pagamento.aluno_id == aluno.id).order_by(Pagamento.id).all()


# ---------- matricular ----------

def test_matricular_calcula_vencimento_e_gera_pagamento_pendente(client, db, recepcao):
    aluno = criar_aluno(db)
    plano = criar_plano(db, "Mensal", 30, "99.90")

    r = client.post("/matriculas", json={"aluno_id": aluno.id, "plano_id": plano.id}, headers=recepcao)

    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["data_inicio"] == hoje().isoformat()
    assert corpo["data_vencimento"] == (hoje() + timedelta(days=29)).isoformat()  # inicio + duracao - 1
    assert corpo["valor"] == "99.90" and corpo["status"] == "ativa" and corpo["situacao"] == "vigente"
    pagamento, = _pagamentos(db, aluno)
    assert pagamento.status == "pendente" and str(pagamento.valor) == "99.90"
    assert pagamento.vencimento == hoje() and pagamento.descricao == "Matrícula — Mensal"
    assert pagamento.matricula_id == corpo["id"]
    assert len(_auditoria(db, "matricula.criar")) == 1


def test_matricular_com_data_inicio_no_passado_e_limite_de_30_dias(client, db, recepcao):
    aluno = criar_aluno(db)
    plano = criar_plano(db, dias=10)

    r = client.post("/matriculas", json={"aluno_id": aluno.id, "plano_id": plano.id, "data_inicio": dias(-30).isoformat()}, headers=recepcao)
    assert r.status_code == 200
    assert r.json()["data_vencimento"] == dias(-30 + 9).isoformat()

    outro = criar_aluno(db, "Outro")
    r = client.post("/matriculas", json={"aluno_id": outro.id, "plano_id": plano.id, "data_inicio": dias(-31).isoformat()}, headers=recepcao)
    assert r.status_code == 422
    assert r.json()["detail"] == "Data de início não pode ser anterior a 30 dias"


def test_matricular_com_data_futura_e_permitido(client, db, recepcao):
    aluno = criar_aluno(db)
    plano = criar_plano(db)

    r = client.post("/matriculas", json={"aluno_id": aluno.id, "plano_id": plano.id, "data_inicio": dias(5).isoformat()}, headers=recepcao)

    assert r.status_code == 200 and r.json()["data_inicio"] == dias(5).isoformat()


def test_uma_matricula_ativa_por_aluno_409(client, db, recepcao):
    aluno = criar_aluno(db)
    plano = criar_plano(db)
    criar_matricula(db, aluno, plano)

    r = client.post("/matriculas", json={"aluno_id": aluno.id, "plano_id": plano.id}, headers=recepcao)

    assert r.status_code == 409 and r.json()["detail"] == "Aluno já possui matrícula ativa"
    assert db.query(Matricula).count() == 1


def test_matricular_validacoes(client, db, recepcao):
    plano = criar_plano(db)
    inativo = criar_plano(db, "Antigo", ativo=False)
    aluno = criar_aluno(db)

    r = client.post("/matriculas", json={"aluno_id": aluno.id, "plano_id": inativo.id}, headers=recepcao)
    assert r.status_code == 422 and r.json()["detail"] == "Plano inativo"

    r = client.post("/matriculas", json={"aluno_id": aluno.id, "plano_id": 99999}, headers=recepcao)
    assert r.status_code == 404 and r.json()["detail"] == "Plano não encontrado"

    r = client.post("/matriculas", json={"aluno_id": 99999, "plano_id": plano.id}, headers=recepcao)
    assert r.status_code == 404 and r.json()["detail"] == "Aluno não encontrado"

    pendente = criar_aluno(db, "Pendente", status="pendente")
    r = client.post("/matriculas", json={"aluno_id": pendente.id, "plano_id": plano.id}, headers=recepcao)
    assert r.status_code == 422 and r.json()["detail"] == "Cadastro do aluno não aprovado"

    desativado = criar_aluno(db, "Desativado", ativo=False)
    r = client.post("/matriculas", json={"aluno_id": desativado.id, "plano_id": plano.id}, headers=recepcao)
    assert r.status_code == 422 and r.json()["detail"] == "Conta do aluno desativada"

    assert client.post("/matriculas", json={"aluno_id": aluno.id}, headers=recepcao).status_code == 422
    assert db.query(Matricula).count() == 0


# ---------- renovar ----------

def test_renovar_antes_do_vencimento_comeca_no_dia_seguinte(client, db, recepcao):
    aluno = criar_aluno(db)
    plano = criar_plano(db, dias=30)
    atual = criar_matricula(db, aluno, plano, inicio=dias(-20))  # vence em 9 dias
    vencimento_anterior = atual.data_vencimento

    r = client.post(f"/matriculas/{atual.id}/renovar", json={}, headers=recepcao)

    assert r.status_code == 200, r.text
    nova = r.json()
    assert nova["data_inicio"] == (vencimento_anterior + timedelta(days=1)).isoformat()
    assert nova["data_vencimento"] == (vencimento_anterior + timedelta(days=30)).isoformat()
    assert nova["matricula_anterior_id"] == atual.id and nova["status"] == "ativa"
    db.refresh(atual)
    assert atual.status == "encerrada"
    gerado = [p for p in _pagamentos(db, aluno) if p.matricula_id == nova["id"]]
    assert len(gerado) == 1 and gerado[0].status == "pendente" and gerado[0].vencimento.isoformat() == nova["data_inicio"]
    assert len(_auditoria(db, "matricula.renovar")) == 1


def test_renovar_depois_do_vencimento_comeca_hoje(client, db, recepcao):
    aluno = criar_aluno(db)
    plano = criar_plano(db, dias=30)
    atual = criar_matricula(db, aluno, plano, inicio=dias(-50))  # venceu há 21 dias

    r = client.post(f"/matriculas/{atual.id}/renovar", json={}, headers=recepcao)

    assert r.json()["data_inicio"] == hoje().isoformat()
    assert r.json()["data_vencimento"] == dias(29).isoformat()


def test_renovar_com_outro_plano_e_sem_corpo(client, db, recepcao):
    aluno = criar_aluno(db)
    mensal = criar_plano(db, "Mensal", 30)
    trimestral = criar_plano(db, "Trimestral", 90, "270.00", periodicidade="trimestral")
    atual = criar_matricula(db, aluno, mensal, inicio=dias(-5))

    r = client.post(f"/matriculas/{atual.id}/renovar", headers=recepcao)  # sem corpo = mesmo plano
    assert r.status_code == 200 and r.json()["plano"]["id"] == mensal.id

    r = client.post(f"/matriculas/{r.json()['id']}/renovar", json={"plano_id": trimestral.id}, headers=recepcao)
    assert r.status_code == 200 and r.json()["plano"]["id"] == trimestral.id and r.json()["valor"] == "270.00"


def test_renovar_validacoes(client, db, recepcao):
    aluno = criar_aluno(db)
    plano = criar_plano(db)
    inativo = criar_plano(db, "Inativo", ativo=False)
    encerrada = criar_matricula(db, aluno, plano, status="encerrada")
    ativa = criar_matricula(db, criar_aluno(db, "Outro"), plano)

    r = client.post(f"/matriculas/{encerrada.id}/renovar", json={}, headers=recepcao)
    assert r.status_code == 409 and r.json()["detail"] == "Matrícula não está ativa"

    r = client.post(f"/matriculas/{ativa.id}/renovar", json={"plano_id": inativo.id}, headers=recepcao)
    assert r.status_code == 422 and r.json()["detail"] == "Plano inativo"

    r = client.post("/matriculas/99999/renovar", json={}, headers=recepcao)
    assert r.status_code == 404 and r.json()["detail"] == "Matrícula não encontrada"


# ---------- alterar plano ----------

def test_alterar_plano_substitui_e_cancela_pendentes_da_antiga(client, db, recepcao):
    aluno = criar_aluno(db)
    mensal = criar_plano(db, "Mensal", 30, "100.00")
    anual = criar_plano(db, "Anual", 365, "900.00", periodicidade="anual")
    antiga = criar_matricula(db, aluno, mensal, inicio=dias(-10))
    pendente = criar_pagamento(db, aluno, "100.00", dias(-10), matricula_id=antiga.id)
    pago = criar_pagamento(db, aluno, "50.00", dias(-20), status="pago", matricula_id=antiga.id)

    r = client.post(f"/matriculas/{antiga.id}/alterar-plano", json={"plano_id": anual.id}, headers=recepcao)

    assert r.status_code == 200, r.text
    nova = r.json()
    assert nova["plano"]["id"] == anual.id and nova["data_inicio"] == hoje().isoformat()
    assert nova["data_vencimento"] == dias(364).isoformat() and nova["matricula_anterior_id"] == antiga.id
    db.refresh(antiga), db.refresh(pendente), db.refresh(pago)
    assert antiga.status == "substituida"
    assert pendente.status == "cancelado" and pago.status == "pago"
    novos = [p for p in _pagamentos(db, aluno) if p.matricula_id == nova["id"]]
    assert len(novos) == 1 and novos[0].status == "pendente" and str(novos[0].valor) == "900.00"
    assert db.query(Matricula).filter(Matricula.aluno_id == aluno.id, Matricula.status == "ativa").count() == 1
    assert len(_auditoria(db, "matricula.alterar_plano")) == 1


def test_alterar_plano_validacoes(client, db, recepcao):
    aluno = criar_aluno(db)
    plano = criar_plano(db)
    inativo = criar_plano(db, "Inativo", ativo=False)
    cancelada = criar_matricula(db, aluno, plano, status="cancelada")
    ativa = criar_matricula(db, criar_aluno(db, "Outro"), plano)

    assert client.post(f"/matriculas/{cancelada.id}/alterar-plano", json={"plano_id": plano.id}, headers=recepcao).status_code == 409
    r = client.post(f"/matriculas/{ativa.id}/alterar-plano", json={"plano_id": inativo.id}, headers=recepcao)
    assert r.status_code == 422 and r.json()["detail"] == "Plano inativo"
    assert client.post(f"/matriculas/{ativa.id}/alterar-plano", json={"plano_id": 99999}, headers=recepcao).status_code == 404
    db.refresh(ativa)
    assert ativa.status == "ativa"  # nada mudou nas falhas


def test_alterar_plano_para_o_mesmo_plano_e_recusado_sem_efeitos(client, db, recepcao):
    aluno = criar_aluno(db)
    plano = criar_plano(db, "Mensal", 30, "100.00")
    ativa = criar_matricula(db, aluno, plano)
    antes = len(_pagamentos(db, aluno))

    r = client.post(f"/matriculas/{ativa.id}/alterar-plano", json={"plano_id": plano.id}, headers=recepcao)

    assert r.status_code == 422 and r.json()["detail"] == "Escolha um plano diferente do atual"
    db.refresh(ativa)
    assert ativa.status == "ativa"
    assert len(_pagamentos(db, aluno)) == antes
    assert len(_auditoria(db, "matricula.alterar_plano")) == 0


# ---------- cancelar ----------

def test_cancelar_exige_motivo_e_cancela_pendentes(client, db, recepcao):
    aluno = criar_aluno(db)
    plano = criar_plano(db)
    matricula = criar_matricula(db, aluno, plano)
    pendente = criar_pagamento(db, aluno, matricula_id=matricula.id)
    de_outra = criar_pagamento(db, aluno, matricula_id=None)

    for corpo in ({}, {"motivo": ""}, {"motivo": "   "}):
        assert client.post(f"/matriculas/{matricula.id}/cancelar", json=corpo, headers=recepcao).status_code == 422

    r = client.post(f"/matriculas/{matricula.id}/cancelar", json={"motivo": "Mudou de cidade"}, headers=recepcao)

    assert r.status_code == 200, r.text
    assert r.json()["status"] == "cancelada" and r.json()["motivo_cancelamento"] == "Mudou de cidade"
    assert r.json()["cancelada_em"] is not None and r.json()["situacao"] is None
    db.refresh(pendente), db.refresh(de_outra)
    assert pendente.status == "cancelado" and de_outra.status == "pendente"
    registro, = _auditoria(db, "matricula.cancelar")
    assert registro.detalhes["motivo"] == "Mudou de cidade"

    r = client.post(f"/matriculas/{matricula.id}/cancelar", json={"motivo": "de novo"}, headers=recepcao)
    assert r.status_code == 409 and r.json()["detail"] == "Matrícula não está ativa"


def test_depois_de_cancelar_pode_matricular_de_novo(client, db, recepcao):
    aluno = criar_aluno(db)
    plano = criar_plano(db)
    matricula = criar_matricula(db, aluno, plano)
    client.post(f"/matriculas/{matricula.id}/cancelar", json={"motivo": "x"}, headers=recepcao)

    r = client.post("/matriculas", json={"aluno_id": aluno.id, "plano_id": plano.id}, headers=recepcao)

    assert r.status_code == 200


# ---------- listagem ----------

def test_listagem_filtros_e_paginacao(client, db, recepcao):
    mensal = criar_plano(db, "Mensal", 30)
    anual = criar_plano(db, "Anual", 365)
    a1, a2, a3, a4 = (criar_aluno(db, f"A{i}") for i in range(4))
    vigente = criar_matricula(db, a1, anual, inicio=dias(-10))
    vencendo = criar_matricula(db, a2, mensal, inicio=dias(-25))
    vencida = criar_matricula(db, a3, mensal, inicio=dias(-60))
    cancelada = criar_matricula(db, a4, mensal, status="cancelada")

    def ids(consulta):
        r = client.get(f"/matriculas?{consulta}", headers=recepcao)
        assert r.status_code == 200
        return {i["id"] for i in r.json()["itens"]}

    assert ids("") == {vigente.id, vencendo.id, vencida.id, cancelada.id}
    assert ids("status=cancelada") == {cancelada.id}
    assert ids("situacao=vigente") == {vigente.id}
    assert ids("situacao=vencendo") == {vencendo.id}
    assert ids("situacao=vencida") == {vencida.id}
    assert ids(f"aluno_id={a2.id}") == {vencendo.id}
    assert ids(f"plano_id={anual.id}") == {vigente.id}

    pagina = client.get("/matriculas?por_pagina=3&pagina=2", headers=recepcao).json()
    assert pagina["total"] == 4 and len(pagina["itens"]) == 1 and pagina["pagina"] == 2
    item = client.get(f"/matriculas?aluno_id={a1.id}", headers=recepcao).json()["itens"][0]
    assert item["aluno"]["nome"] == "A0" and item["plano"]["nome"] == "Anual" and item["situacao"] == "vigente"
    assert client.get("/matriculas?status=xyz", headers=recepcao).status_code == 422
