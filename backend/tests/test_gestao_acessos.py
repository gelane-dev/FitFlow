"""GA-02a: controle de entrada (avaliar_acesso com todos os motivos, verificar, registrar, forçar, listagem)."""
from datetime import timedelta

import pytest

from gestao_fabrica import (
    TODAS_PERMISSOES, criar_acesso, criar_aluno, criar_matricula, criar_pagamento, criar_plano, criar_recepcao,
    dias, headers,
)
from app.core.tempo import agora_naive
from app.models import Acesso, Auditoria
from app.services.acessos import avaliar_acesso
from app.services.configuracao import obter_configuracao


@pytest.fixture
def recepcao(db):
    usuario, _ = criar_recepcao(db, TODAS_PERMISSOES)
    return headers(usuario)


@pytest.fixture
def plano(db):
    return criar_plano(db, "Mensal", 30)


def _config(db, **campos):
    configuracao = obter_configuracao(db)
    for campo, valor in campos.items():
        setattr(configuracao, campo, valor)
    db.commit()


def _motivos(db, aluno):
    db.refresh(aluno)
    return avaliar_acesso(db, aluno)


# ---------- avaliar_acesso: cada motivo ----------

def test_aluno_em_dia_e_autorizado(db, plano):
    aluno = criar_aluno(db)
    criar_matricula(db, aluno, plano)

    assert _motivos(db, aluno) == {"autorizado": True, "motivos": []}


def test_motivo_sem_matricula(db):
    assert _motivos(db, criar_aluno(db)) == {"autorizado": False, "motivos": ["sem_matricula"]}


def test_motivo_matricula_vencida(db, plano):
    aluno = criar_aluno(db)
    criar_matricula(db, aluno, plano, inicio=dias(-31))  # venceu há 2 dias

    assert _motivos(db, aluno) == {"autorizado": False, "motivos": ["matricula_vencida"]}


def test_matricula_cancelada_ou_encerrada_conta_como_sem_matricula(db, plano):
    aluno = criar_aluno(db)
    criar_matricula(db, aluno, plano, status="cancelada")
    criar_matricula(db, aluno, plano, status="encerrada")

    assert _motivos(db, aluno)["motivos"] == ["sem_matricula"]


def test_tolerancia_de_vencimento(db, plano):
    aluno = criar_aluno(db)
    criar_matricula(db, aluno, plano, inicio=dias(-31))  # venceu há 2 dias (inicio + 29)

    assert _motivos(db, aluno)["motivos"] == ["matricula_vencida"]  # tolerância padrão 0
    _config(db, tolerancia_dias_vencimento=2)
    assert _motivos(db, aluno)["autorizado"] is True  # dentro da tolerância (2 dias de atraso)
    _config(db, tolerancia_dias_vencimento=1)
    assert _motivos(db, aluno)["motivos"] == ["matricula_vencida"]


def test_motivo_conta_desativada_e_cadastro_pendente(db, plano):
    desativado = criar_aluno(db, "Desativado", ativo=False)
    criar_matricula(db, desativado, plano)
    pendente = criar_aluno(db, "Pendente", status="pendente")
    criar_matricula(db, pendente, plano)
    recusado = criar_aluno(db, "Recusado", status="recusado")
    criar_matricula(db, recusado, plano)

    assert _motivos(db, desativado)["motivos"] == ["conta_desativada"]
    assert _motivos(db, pendente)["motivos"] == ["cadastro_pendente"]
    assert _motivos(db, recusado)["motivos"] == ["cadastro_pendente"]


def test_motivo_restricao(db, plano):
    aluno = criar_aluno(db, restricao="Aguardar liberação")
    criar_matricula(db, aluno, plano)

    assert _motivos(db, aluno) == {"autorizado": False, "motivos": ["restricao"]}


def test_bloquear_pagamento_pendente_so_quando_configurado_e_vencido(db, plano):
    aluno = criar_aluno(db)
    criar_matricula(db, aluno, plano)
    criar_pagamento(db, aluno, vencimento=dias(-1))

    assert _motivos(db, aluno)["autorizado"] is True  # configuração desligada (padrão)
    _config(db, bloquear_pagamento_pendente=True)
    assert _motivos(db, aluno)["motivos"] == ["pagamento_pendente"]


def test_pagamento_pendente_a_vencer_ou_pago_nao_bloqueia(db, plano):
    aluno = criar_aluno(db)
    criar_matricula(db, aluno, plano)
    criar_pagamento(db, aluno, vencimento=dias(0))
    criar_pagamento(db, aluno, vencimento=dias(-9), status="pago")
    criar_pagamento(db, aluno, vencimento=dias(-9), status="cancelado")
    _config(db, bloquear_pagamento_pendente=True)

    assert _motivos(db, aluno)["autorizado"] is True


def test_motivos_se_acumulam(db):
    aluno = criar_aluno(db, ativo=False, status="pendente", restricao="x")

    assert _motivos(db, aluno)["motivos"] == ["conta_desativada", "cadastro_pendente", "restricao", "sem_matricula"]


# ---------- GET /acessos/verificar ----------

def test_verificar_por_id_e_por_codigo(client, db, recepcao, plano):
    aluno = criar_aluno(db, "Verificado")
    criar_matricula(db, aluno, plano, inicio=dias(-27))  # vence em 2 dias → vencendo
    criar_pagamento(db, aluno, "30.00", dias(-1))
    criar_pagamento(db, aluno, "20.00", dias(5))
    criar_acesso(db, aluno, agora_naive() - timedelta(hours=3))
    criar_acesso(db, aluno, agora_naive() - timedelta(hours=2), resultado="bloqueado")

    por_id = client.get(f"/acessos/verificar?aluno_id={aluno.id}", headers=recepcao)
    por_codigo = client.get(f"/acessos/verificar?codigo={aluno.codigo_acesso}", headers=recepcao)

    assert por_id.status_code == 200, por_id.text
    assert por_codigo.json() == por_id.json()
    corpo = por_id.json()
    assert corpo["aluno"] == {"id": aluno.id, "nome": "Verificado", "foto": None, "status_cadastro": "aprovado", "ativo": True}
    assert corpo["autorizado"] is True and corpo["motivos"] == []
    assert corpo["matricula"]["plano"] == "Mensal" and corpo["matricula"]["situacao"] == "vencendo"
    assert corpo["matricula"]["data_vencimento"] == dias(2).isoformat()
    assert corpo["pendencias"] == {"quantidade": 2, "valor_total": "50.00"}
    assert len(corpo["ultimas_entradas"]) == 1  # só entradas liberadas


def test_verificar_bloqueado_traz_mensagens_do_contrato(client, db, recepcao, plano):
    aluno = criar_aluno(db, restricao="Documento pendente")
    criar_matricula(db, aluno, plano, inicio=dias(-40))  # venceu em dias(-11)

    corpo = client.get(f"/acessos/verificar?aluno_id={aluno.id}", headers=recepcao).json()

    assert corpo["autorizado"] is False
    mensagens = {m["codigo"]: m["mensagem"] for m in corpo["motivos"]}
    assert mensagens["restricao"] == "Restrição: Documento pendente"
    assert mensagens["matricula_vencida"] == f"Matrícula vencida em {dias(-11).strftime('%d/%m/%Y')}"
    assert corpo["matricula"]["situacao"] == "vencida"


def test_mensagens_fixas(client, db, recepcao):
    sem = criar_aluno(db, "Sem")
    desativado = criar_aluno(db, "Desativado", ativo=False, status="pendente")

    assert client.get(f"/acessos/verificar?aluno_id={sem.id}", headers=recepcao).json()["motivos"] == [
        {"codigo": "sem_matricula", "mensagem": "Sem matrícula ativa"}]
    assert client.get(f"/acessos/verificar?aluno_id={desativado.id}", headers=recepcao).json()["motivos"][:2] == [
        {"codigo": "conta_desativada", "mensagem": "Conta desativada"},
        {"codigo": "cadastro_pendente", "mensagem": "Cadastro não aprovado"}]


def test_verificar_parametros_invalidos(client, recepcao):
    r = client.get("/acessos/verificar", headers=recepcao)
    assert r.status_code == 422 and r.json()["detail"] == "Informe aluno_id ou codigo"
    for consulta in ("aluno_id=99999", "codigo=naoexiste"):
        r = client.get(f"/acessos/verificar?{consulta}", headers=recepcao)
        assert r.status_code == 404 and r.json()["detail"] == "Aluno não encontrado"


# ---------- POST /acessos ----------

def test_entrada_liberada_nao_vai_para_a_auditoria(client, db, recepcao, plano):
    aluno = criar_aluno(db)
    criar_matricula(db, aluno, plano)

    r = client.post("/acessos", json={"aluno_id": aluno.id}, headers=recepcao)

    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["resultado"] == "liberado" and corpo["motivos"] == [] and corpo["liberacao_manual"] is False
    assert corpo["origem"] == "manual" and corpo["registrado_por"] == "Recepção Um" and corpo["aluno"]["nome"] == aluno.nome
    assert db.query(Acesso).filter(Acesso.resultado == "liberado").count() == 1
    assert db.query(Auditoria).filter(Auditoria.entidade == "acesso").count() == 0


def test_entrada_por_codigo_e_origem(client, db, recepcao, plano):
    aluno = criar_aluno(db)
    criar_matricula(db, aluno, plano)

    r = client.post("/acessos", json={"codigo": aluno.codigo_acesso, "origem": "qrcode"}, headers=recepcao)

    assert r.status_code == 200 and r.json()["origem"] == "qrcode"
    assert client.post("/acessos", json={"aluno_id": aluno.id, "origem": "biometria"}, headers=recepcao).status_code == 422
    assert client.post("/acessos", json={}, headers=recepcao).status_code == 422
    assert client.post("/acessos", json={"aluno_id": 99999}, headers=recepcao).status_code == 404


def test_entrada_bloqueada_e_gravada_com_200(client, db, recepcao):
    aluno = criar_aluno(db)  # sem matrícula

    r = client.post("/acessos", json={"aluno_id": aluno.id}, headers=recepcao)

    assert r.status_code == 200
    assert r.json()["resultado"] == "bloqueado"
    assert r.json()["motivos"] == [{"codigo": "sem_matricula", "mensagem": "Sem matrícula ativa"}]
    acesso, = db.query(Acesso).all()
    assert acesso.resultado == "bloqueado" and acesso.motivos == ["sem_matricula"] and acesso.liberacao_manual is False


def test_reavalia_no_servidor_ignorando_o_que_o_cliente_viu(client, db, recepcao, plano):
    aluno = criar_aluno(db)
    matricula = criar_matricula(db, aluno, plano)
    assert client.get(f"/acessos/verificar?aluno_id={aluno.id}", headers=recepcao).json()["autorizado"] is True

    matricula.status = "cancelada"
    db.commit()

    assert client.post("/acessos", json={"aluno_id": aluno.id}, headers=recepcao).json()["resultado"] == "bloqueado"


def test_forcar_libera_manualmente_e_audita(client, db, plano):
    usuario, _ = criar_recepcao(db, ["registrar_acesso", "liberar_acesso_manual"], email="forca@gestao.com", nome="Forçadora")
    aluno = criar_aluno(db, restricao="Aviso")

    r = client.post("/acessos", json={"aluno_id": aluno.id, "forcar": True}, headers=headers(usuario))

    assert r.status_code == 200
    assert r.json()["resultado"] == "liberado" and r.json()["liberacao_manual"] is True
    assert {m["codigo"] for m in r.json()["motivos"]} == {"restricao", "sem_matricula"}
    registro, = db.query(Auditoria).filter(Auditoria.acao == "acesso.liberado_manual").all()
    assert registro.user_id == usuario.id and registro.detalhes["motivos"] == ["restricao", "sem_matricula"]


def test_forcar_sem_permissao_403_e_nada_e_gravado(client, db):
    usuario, _ = criar_recepcao(db, ["registrar_acesso"])
    aluno = criar_aluno(db)

    r = client.post("/acessos", json={"aluno_id": aluno.id, "forcar": True}, headers=headers(usuario))

    assert r.status_code == 403 and r.json()["detail"] == "Permissão insuficiente"
    assert db.query(Acesso).count() == 0


def test_forcar_em_aluno_autorizado_nao_marca_liberacao_manual(client, db, plano):
    usuario, _ = criar_recepcao(db, ["registrar_acesso", "liberar_acesso_manual"])
    aluno = criar_aluno(db)
    criar_matricula(db, aluno, plano)

    r = client.post("/acessos", json={"aluno_id": aluno.id, "forcar": True}, headers=headers(usuario))

    assert r.json()["resultado"] == "liberado" and r.json()["liberacao_manual"] is False
    assert db.query(Auditoria).filter(Auditoria.acao == "acesso.liberado_manual").count() == 0


def test_admin_pode_forcar(client, db, admin_headers):
    aluno = criar_aluno(db)

    r = client.post("/acessos", json={"aluno_id": aluno.id, "forcar": True}, headers=admin_headers)

    assert r.json()["resultado"] == "liberado" and r.json()["liberacao_manual"] is True


# ---------- GET /acessos ----------

def test_listagem_padrao_hoje_e_filtros(client, db, recepcao):
    a, b = criar_aluno(db, "Aa"), criar_aluno(db, "Bb")
    hoje_a = criar_acesso(db, a)
    hoje_b = criar_acesso(db, b, resultado="bloqueado")
    ontem = criar_acesso(db, a, agora_naive() - timedelta(days=1))

    def ids(consulta=""):
        r = client.get(f"/acessos?{consulta}", headers=recepcao)
        assert r.status_code == 200
        return [i["id"] for i in r.json()["itens"]]

    assert set(ids()) == {hoje_a.id, hoje_b.id}
    assert ids(f"data={ontem.data_hora.date()}") == [ontem.id]
    assert ids(f"aluno_id={b.id}") == [hoje_b.id]
    assert ids("resultado=bloqueado") == [hoje_b.id]
    assert ids("resultado=liberado") == [hoje_a.id]
    assert client.get("/acessos?resultado=xyz", headers=recepcao).status_code == 422

    pagina = client.get("/acessos?por_pagina=1", headers=recepcao).json()
    assert pagina["total"] == 2 and len(pagina["itens"]) == 1 and pagina["por_pagina"] == 1
    item = client.get(f"/acessos?aluno_id={b.id}", headers=recepcao).json()["itens"][0]
    assert item["aluno"]["nome"] == "Bb" and item["motivos"] == []
