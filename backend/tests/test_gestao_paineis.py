"""GA-02a: dashboards (admin, recepção) e financeiro, com números conferidos contra dados criados no teste."""
from datetime import datetime

import pytest

from gestao_fabrica import (
    TODAS_PERMISSOES, criar_acesso, criar_aluno, criar_matricula, criar_pagamento, criar_plano, criar_professor,
    criar_recepcao, dias, headers,
)
from app.core.tempo import agora_naive, hoje
from app.models import Auditoria, Matricula, User
from app.services.configuracao import obter_configuracao


def _mes(delta=0):
    """(ano, mês) relativo ao mês atual, calculado sem usar o código da aplicação."""
    ano, mes0 = divmod(hoje().year * 12 + hoje().month - 1 + delta, 12)
    return ano, mes0 + 1


def _rotulo(delta=0):
    ano, mes = _mes(delta)
    return f"{ano:04d}-{mes:02d}"


def _data(delta, dia=15) -> datetime:
    ano, mes = _mes(delta)
    return datetime(ano, mes, dia, 12, 0)


@pytest.fixture
def recepcao(db):
    usuario, _ = criar_recepcao(db, TODAS_PERMISSOES)
    return headers(usuario)


@pytest.fixture
def cenario(db):
    """7 alunos em situações conhecidas (ver os comentários), 1 professor ativo e 1 inativo, 2 recepcionistas (1 ativa)."""
    _, p1 = criar_professor(db, "Prof Um")
    criar_professor(db, "Prof Inativo", ativo=False)
    criar_recepcao(db, TODAS_PERMISSOES, email="ativa@gestao.com", nome="Recep Ativa")
    criar_recepcao(db, [], email="inativa@gestao.com", nome="Recep Inativa", ativo=False)

    mensal = criar_plano(db, "Mensal", 30, "100.00")
    anual = criar_plano(db, "Anual", 365, "900.00", periodicidade="anual")

    a = criar_aluno(db, "A Vigente", professor_id=p1.id, criado_em=_data(-2))
    criar_matricula(db, a, anual, inicio=dias(-10))
    b = criar_aluno(db, "B Vencendo")
    criar_matricula(db, b, mensal, inicio=dias(-25))  # vence em 4 dias
    c = criar_aluno(db, "C Vencida")
    criar_matricula(db, c, mensal, inicio=dias(-40))
    d = criar_aluno(db, "D Sem Data", criado_em=None)
    e = criar_aluno(db, "E Pendente", status="pendente")
    f = criar_aluno(db, "F Desativado", ativo=False)
    criar_matricula(db, f, mensal, inicio=dias(-1))
    g = criar_aluno(db, "G Inadimplente")
    antiga_g = criar_matricula(db, g, mensal, inicio=dias(-45), status="encerrada", criado_em=_data(-1))
    criar_matricula(db, g, mensal, inicio=dias(-5), matricula_anterior_id=antiga_g.id)  # renovação
    criar_matricula(db, d, mensal, inicio=dias(-50), status="cancelada", criado_em=_data(-1),
                    cancelada_em=agora_naive(), motivo_cancelamento="x")
    criar_pagamento(db, g, "100.00", dias(-3))
    criar_pagamento(db, b, "100.00", dias(10))

    for _ in range(3):
        criar_acesso(db, a)
    criar_acesso(db, b)
    criar_acesso(db, c, resultado="bloqueado")
    criar_acesso(db, b, _data(-2, 10))
    return dict(a=a, b=b, c=c, d=d, e=e, f=f, g=g, p1=p1)


# ---------- dashboard admin ----------

def test_dashboard_admin_totais_conferidos(client, admin_headers, cenario):
    r = client.get("/admin/dashboard", headers=admin_headers)

    assert r.status_code == 200, r.text
    assert r.json()["totais"] == {
        "alunos": 7,
        "ativos": 3,         # A, B, G: conta ativa, aprovado, matrícula vigente
        "inativos": 3,       # aprovados que não são ativos: C (vencida), D (sem matrícula), F (conta desativada)
        "pendentes": 1,      # E
        "vencidos": 1,       # C
        "vencendo": 1,       # B
        "inadimplentes": 1,  # G
        "professores": 1,
        "recepcionistas": 1,
    }
    assert r.json()["series"]["ativos_inativos"] == {"ativos": 3, "inativos": 3}


def test_dashboard_admin_distribuicoes(client, admin_headers, cenario):
    corpo = client.get("/admin/dashboard", headers=admin_headers).json()

    assert corpo["alunos_por_professor"] == [
        {"professor_id": None, "nome": "Sem professor", "total": 6},  # B, C, D, E, F, G (todos os alunos, como totais.alunos)
        {"professor_id": cenario["p1"].id, "nome": "Prof Um", "total": 1},
    ]
    assert sum(x["total"] for x in corpo["alunos_por_professor"]) == corpo["totais"]["alunos"]
    assert [(x["nome"], x["total"]) for x in corpo["alunos_por_plano"]] == [("Mensal", 4), ("Anual", 1)]  # B, C, F, G | A
    assert corpo["matriculas"] == {"novas_mes": 4, "renovacoes_mes": 1, "cancelamentos_mes": 1}


def test_dashboard_admin_series(client, admin_headers, cenario):
    series = client.get("/admin/dashboard", headers=admin_headers).json()["series"]

    cadastros = series["cadastros_por_mes"]
    assert len(cadastros) == 13  # 12 meses + sem_data
    assert [c["mes"] for c in cadastros[:12]] == [_rotulo(d) for d in range(-11, 1)]
    por_mes = {c["mes"]: c["total"] for c in cadastros}
    assert por_mes[_rotulo(0)] == 5   # B, C, E, F, G
    assert por_mes[_rotulo(-2)] == 1  # A
    assert por_mes["sem_data"] == 1   # D, criado_em nulo
    assert sum(por_mes.values()) == 7

    frequencia = series["frequencia_por_mes"]
    assert [f["mes"] for f in frequencia] == [_rotulo(d) for d in range(-11, 1)]
    por_mes = {f["mes"]: f for f in frequencia}
    assert por_mes[_rotulo(0)] == {"mes": _rotulo(0), "entradas": 4, "alunos_distintos": 2}  # A×3 + B (bloqueio não conta)
    assert por_mes[_rotulo(-2)] == {"mes": _rotulo(-2), "entradas": 1, "alunos_distintos": 1}
    assert por_mes[_rotulo(-1)]["entradas"] == 0


def test_dashboard_admin_alunos_recentes(client, admin_headers, cenario):
    recentes = client.get("/admin/dashboard", headers=admin_headers).json()["alunos_recentes"]

    assert [r["nome"] for r in recentes] == ["G Inadimplente", "F Desativado", "E Pendente", "C Vencida", "B Vencendo"]
    assert set(recentes[0]) == {"id", "nome", "foto", "status_cadastro", "criado_em"}


def test_dashboard_admin_vazio(client, admin_headers):
    corpo = client.get("/admin/dashboard", headers=admin_headers).json()

    assert all(v == 0 for v in corpo["totais"].values())
    assert corpo["alunos_recentes"] == [] and corpo["alunos_por_professor"] == [] and corpo["alunos_por_plano"] == []
    assert corpo["matriculas"] == {"novas_mes": 0, "renovacoes_mes": 0, "cancelamentos_mes": 0}
    assert len(corpo["series"]["cadastros_por_mes"]) == 13 and len(corpo["series"]["frequencia_por_mes"]) == 12
    assert corpo["series"]["cadastros_por_mes"][-1] == {"mes": "sem_data", "total": 0}


def test_dashboard_admin_respeita_dias_de_alerta_configurados(client, db, admin_headers, cenario):
    configuracao = obter_configuracao(db)
    configuracao.dias_alerta_vencimento = 40  # tudo que vigora (A vence em 354 dias não) passa a "vencendo"
    db.commit()

    totais = client.get("/admin/dashboard", headers=admin_headers).json()["totais"]

    assert totais["vencendo"] == 3  # B (+4), G (+24), F (+28); A vence em ~354 dias
    assert totais["ativos"] == 3  # "ativo" ignora o alerta


# ---------- dashboard da recepção ----------

def test_dashboard_recepcao_numeros_conferidos(client, db, recepcao, cenario):
    r = client.get("/recepcao/dashboard", headers=recepcao)

    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["ativos"] == 3
    assert corpo["entradas_hoje"] == 4
    assert corpo["matriculas_hoje"] == 5  # A, B, C, F e a atual de G (as antigas foram criadas no mês anterior)
    assert corpo["vencendo"] == 1 and corpo["vencidos"] == 1
    assert corpo["com_pendencia"] == 2  # G (vencido) e B (a vencer)
    assert corpo["cadastros_pendentes"] == 1
    assert [c["nome"] for c in corpo["ultimos_cadastros"]] == ["G Inadimplente", "F Desativado", "E Pendente", "C Vencida", "B Vencendo"]


def test_dashboard_recepcao_atendimentos_recentes(client, db, admin_headers, cenario):
    recepcionista = db.query(User).filter(User.tipo == "recepcao").first()
    professor = db.query(User).filter(User.tipo == "professor").first()
    for i in range(12):
        db.add(Auditoria(user_id=recepcionista.id, data_hora=agora_naive(), acao="aluno.cadastrar", entidade="aluno", descricao=f"a{i}"))
    db.add(Auditoria(user_id=professor.id, data_hora=agora_naive(), acao="aluno.editar", entidade="aluno", descricao="de professor"))
    db.add(Auditoria(user_id=recepcionista.id, data_hora=agora_naive(), acao="plano.criar", entidade="plano", descricao="fora do escopo"))
    db.commit()

    atendimentos = client.get("/recepcao/dashboard", headers=admin_headers).json()["atendimentos_recentes"]

    assert len(atendimentos) == 10
    assert {a["usuario"]["tipo"] for a in atendimentos} <= {"recepcao", "admin"}
    assert all(a["acao"].split(".")[0] in {"aluno", "matricula", "pagamento", "acesso"} for a in atendimentos)


def test_dashboard_recepcao_vazio(client, recepcao):
    corpo = client.get("/recepcao/dashboard", headers=recepcao).json()

    assert {k: v for k, v in corpo.items() if isinstance(v, int)} == {
        "ativos": 0, "entradas_hoje": 0, "matriculas_hoje": 0, "vencendo": 0, "vencidos": 0,
        "com_pendencia": 0, "cadastros_pendentes": 0}
    assert corpo["ultimos_cadastros"] == [] and corpo["atendimentos_recentes"] == []


# ---------- financeiro ----------

@pytest.fixture
def financas(db):
    a = criar_aluno(db, "Pagador")
    b = criar_aluno(db, "Devedor")
    agora = agora_naive()
    criar_pagamento(db, a, "100.00", status="pago", forma="pix", valor_recebido="100.00", pago_em=agora)
    criar_pagamento(db, a, "60.00", status="pago", forma="dinheiro", valor_recebido="50.00", pago_em=agora)
    criar_pagamento(db, a, "200.00", status="pago", forma="pix", valor_recebido="200.00", pago_em=_data(-1))
    criar_pagamento(db, a, "999.00", status="estornado", forma="pix", valor_recebido="999.00", pago_em=agora)
    criar_pagamento(db, b, "50.00", dias(-3))   # pendente vencido
    criar_pagamento(db, b, "30.00", dias(-1))   # pendente vencido (mesmo aluno)
    criar_pagamento(db, a, "70.00", dias(10))   # pendente a vencer
    criar_pagamento(db, a, "5.00", dias(-9), status="cancelado")


def test_financeiro_mes_atual_por_padrao(client, admin_headers, financas):
    r = client.get("/admin/financeiro", headers=admin_headers)

    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["recebido_periodo"] == "150.00"   # 100 + 50 (valor_recebido, não valor); estorno não conta
    assert corpo["pendente_total"] == "150.00"     # 50 + 30 + 70
    assert corpo["vencido_total"] == "80.00"       # 50 + 30
    assert corpo["inadimplentes"] == 1             # um único aluno devedor
    assert corpo["inicio"] == hoje().replace(day=1).isoformat()
    assert {f["forma"]: f["total"] for f in corpo["recebido_por_forma"]} == {"pix": "100.00", "dinheiro": "50.00"}
    por_mes = {m["mes"]: m["total"] for m in corpo["recebido_por_mes"]}
    assert len(corpo["recebido_por_mes"]) == 12
    assert por_mes[_rotulo(0)] == "150.00" and por_mes[_rotulo(-1)] == "200.00" and por_mes[_rotulo(-5)] == "0.00"


def test_financeiro_com_periodo_informado(client, admin_headers, financas):
    inicio = _data(-1, 1).date().isoformat()

    corpo = client.get(f"/admin/financeiro?inicio={inicio}&fim={hoje().isoformat()}", headers=admin_headers).json()

    assert corpo["recebido_periodo"] == "350.00"
    assert {f["forma"]: f["total"] for f in corpo["recebido_por_forma"]} == {"pix": "300.00", "dinheiro": "50.00"}
    assert corpo["recebido_por_forma"][0]["forma"] == "pix"  # maior total primeiro

    so_mes_passado = client.get(f"/admin/financeiro?inicio={inicio}&fim={_data(-1, 28).date().isoformat()}", headers=admin_headers).json()
    assert so_mes_passado["recebido_periodo"] == "200.00"


def test_financeiro_dia_final_e_inclusivo(client, admin_headers, financas):
    hoje_iso = hoje().isoformat()

    corpo = client.get(f"/admin/financeiro?inicio={hoje_iso}&fim={hoje_iso}", headers=admin_headers).json()

    assert corpo["recebido_periodo"] == "150.00"


def test_financeiro_periodo_invalido_422(client, admin_headers):
    r = client.get(f"/admin/financeiro?inicio={dias(1)}&fim={dias(-1)}", headers=admin_headers)

    assert r.status_code == 422 and r.json()["detail"] == "Data inicial não pode ser posterior à final"
    assert client.get("/admin/financeiro?inicio=ontem", headers=admin_headers).status_code == 422


def test_financeiro_vazio(client, admin_headers):
    corpo = client.get("/admin/financeiro", headers=admin_headers).json()

    assert corpo["recebido_periodo"] == "0.00" and corpo["pendente_total"] == "0.00"
    assert corpo["vencido_total"] == "0.00" and corpo["inadimplentes"] == 0
    assert corpo["recebido_por_forma"] == [] and all(m["total"] == "0.00" for m in corpo["recebido_por_mes"])
