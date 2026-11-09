from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from app.models import HistoricoExecucao


def _registrar(db, aluno_id, item_id, quando, series, reps, carga):
    db.add(HistoricoExecucao(item_ficha_id=item_id, aluno_id=aluno_id, data_execucao=datetime.fromisoformat(quando),
                             series_realizadas=series, repeticoes_realizadas=reps, carga_utilizada=carga))
    db.commit()


def _popular(db, aluno_id, item_id):
    _registrar(db, aluno_id, item_id, "2026-03-02T09:00:00", 1, 10, 20)
    _registrar(db, aluno_id, item_id, "2026-03-02T09:05:00", 1, 8, 25)
    _registrar(db, aluno_id, item_id, "2026-03-09T09:00:00", 3, 10, 30)


def test_resumo_vazio(client, aluno_headers):
    r = client.get("/evolucao/exercicios", headers=aluno_headers)
    assert r.status_code == 200
    assert r.json() == []


def test_resumo_exercicios(client, db, aluno_headers, aluno_id, item_id, exercicio_id):
    _popular(db, aluno_id, item_id)
    r = client.get("/evolucao/exercicios", headers=aluno_headers)
    assert r.status_code == 200
    assert r.json() == [{
        "exercicio_id": exercicio_id, "nome": "Supino", "grupo_muscular": "peito", "total_registros": 3,
        "ultima_carga": 30.0, "carga_maxima": 30.0, "ultima_data": "2026-03-09T09:00:00-03:00",
    }]


def test_evolucao_agrega_por_dia_em_ordem_crescente(client, db, aluno_headers, aluno_id, item_id, exercicio_id):
    _popular(db, aluno_id, item_id)
    r = client.get(f"/evolucao/exercicios/{exercicio_id}", headers=aluno_headers)
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["exercicio_id"] == exercicio_id
    assert corpo["nome"] == "Supino"
    assert corpo["pontos"] == [
        {"data": "2026-03-02", "carga_maxima": 25.0, "volume": 1 * 10 * 20 + 1 * 8 * 25, "registros": 2,
         "repeticoes_maximas": 10, "series": 2},
        {"data": "2026-03-09", "carga_maxima": 30.0, "volume": 3 * 10 * 30, "registros": 1,
         "repeticoes_maximas": 10, "series": 3},
    ]


def test_evolucao_sem_registros_404(client, aluno_headers, exercicio_id):
    r = client.get(f"/evolucao/exercicios/{exercicio_id}", headers=aluno_headers)
    assert r.status_code == 404
    assert r.json()["detail"] == "Sem registros para este exercício"
    assert client.get("/evolucao/exercicios/999", headers=aluno_headers).status_code == 404


def test_evolucao_isola_alunos(client, db, outro_aluno_headers, aluno_id, item_id, exercicio_id):
    _popular(db, aluno_id, item_id)
    assert client.get("/evolucao/exercicios", headers=outro_aluno_headers).json() == []
    assert client.get(f"/evolucao/exercicios/{exercicio_id}", headers=outro_aluno_headers).status_code == 404


def test_evolucao_perfil_errado_403(client, professor_headers, exercicio_id):
    assert client.get("/evolucao/exercicios", headers=professor_headers).status_code == 403
    assert client.get(f"/evolucao/exercicios/{exercicio_id}", headers=professor_headers).status_code == 403


def test_evolucao_visao_do_professor(client, db, professor_headers, outro_professor_headers, aluno_headers,
                                     aluno_id, item_id, exercicio_id):
    _popular(db, aluno_id, item_id)
    # qualquer professor acessa (ADR-022)
    for headers in (professor_headers, outro_professor_headers):
        resumo = client.get(f"/alunos/{aluno_id}/evolucao/exercicios", headers=headers)
        assert resumo.status_code == 200
        assert resumo.json()[0]["total_registros"] == 3
        detalhe = client.get(f"/alunos/{aluno_id}/evolucao/exercicios/{exercicio_id}", headers=headers)
        assert len(detalhe.json()["pontos"]) == 2


def test_evolucao_visao_do_professor_erros(client, professor_headers, aluno_headers, aluno_id, exercicio_id):
    assert client.get(f"/alunos/{aluno_id}/evolucao/exercicios", headers=aluno_headers).status_code == 403
    assert client.get(f"/alunos/{aluno_id}/evolucao/exercicios/{exercicio_id}", headers=aluno_headers).status_code == 403
    assert client.get("/alunos/999/evolucao/exercicios", headers=professor_headers).status_code == 404
    assert client.get(f"/alunos/999/evolucao/exercicios/{exercicio_id}", headers=professor_headers).status_code == 404
    r = client.get(f"/alunos/{aluno_id}/evolucao/exercicios/{exercicio_id}", headers=professor_headers)
    assert r.status_code == 404
    assert r.json()["detail"] == "Sem registros para este exercício"


# ---------- EV-01: periodo, campos novos e comparacao ----------

HOJE = datetime(2026, 11, 7, 15, 0, tzinfo=ZoneInfo("America/Sao_Paulo"))


@pytest.fixture
def hoje_fixo(monkeypatch):
    monkeypatch.setattr("app.services.evolucao.agora", lambda: HOJE)


def _dia(dias_atras, hora="09:00:00"):
    return (HOJE.date() - timedelta(days=dias_atras)).isoformat() + "T" + hora


def _url(exercicio_id, periodo=None):
    return f"/evolucao/exercicios/{exercicio_id}" + (f"?periodo={periodo}" if periodo else "")


@pytest.mark.parametrize("periodo,dias", [("7d", 7), ("30d", 30), ("3m", 90), ("6m", 180), ("1a", 365)])
def test_periodo_limite_da_janela(client, db, hoje_fixo, aluno_headers, aluno_id, item_id, exercicio_id, periodo, dias):
    _registrar(db, aluno_id, item_id, _dia(dias - 1), 1, 10, 20)  # primeiro dia dentro
    _registrar(db, aluno_id, item_id, _dia(dias), 1, 10, 30)  # primeiro dia fora
    _registrar(db, aluno_id, item_id, _dia(0, "23:59:00"), 1, 10, 40)  # hoje
    corpo = client.get(_url(exercicio_id, periodo), headers=aluno_headers).json()
    assert corpo["periodo"] == periodo
    assert [p["data"] for p in corpo["pontos"]] == [_dia(dias - 1)[:10], _dia(0)[:10]]


def test_sem_periodo_devolve_todo_o_historico(client, db, hoje_fixo, aluno_headers, aluno_id, item_id, exercicio_id):
    _registrar(db, aluno_id, item_id, _dia(400), 1, 10, 20)
    _registrar(db, aluno_id, item_id, _dia(1), 1, 10, 30)
    corpo = client.get(_url(exercicio_id), headers=aluno_headers).json()
    assert corpo["periodo"] is None
    assert len(corpo["pontos"]) == 2


def test_periodo_invalido_422(client, aluno_headers, professor_headers, aluno_id, exercicio_id):
    assert client.get(_url(exercicio_id, "2a"), headers=aluno_headers).status_code == 422
    assert client.get(f"/alunos/{aluno_id}/evolucao/exercicios/{exercicio_id}?periodo=xx",
                      headers=professor_headers).status_code == 422


def test_periodo_vazio_com_historico_200_e_comparacao(client, db, hoje_fixo, aluno_headers, aluno_id, item_id,
                                                      exercicio_id):
    _registrar(db, aluno_id, item_id, _dia(100), 3, 10, 20)
    r = client.get(_url(exercicio_id, "7d"), headers=aluno_headers)
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["pontos"] == []
    assert corpo["comparacao"]["atual"]["data"] == _dia(100)[:10]
    assert corpo["comparacao"]["anterior"] is None


def test_periodo_sem_historico_404(client, aluno_headers, exercicio_id):
    r = client.get(_url(exercicio_id, "30d"), headers=aluno_headers)
    assert r.status_code == 404
    assert r.json()["detail"] == "Sem registros para este exercício"


def test_periodo_isola_alunos(client, db, hoje_fixo, outro_aluno_headers, aluno_id, item_id, exercicio_id):
    _registrar(db, aluno_id, item_id, _dia(1), 1, 10, 20)
    assert client.get(_url(exercicio_id, "30d"), headers=outro_aluno_headers).status_code == 404


def test_periodo_na_rota_do_professor(client, db, hoje_fixo, professor_headers, aluno_id, item_id, exercicio_id):
    _registrar(db, aluno_id, item_id, _dia(2), 1, 10, 20)
    _registrar(db, aluno_id, item_id, _dia(60), 1, 10, 30)
    r = client.get(f"/alunos/{aluno_id}/evolucao/exercicios/{exercicio_id}?periodo=30d", headers=professor_headers)
    corpo = r.json()
    assert corpo["periodo"] == "30d"
    assert len(corpo["pontos"]) == 1
    assert corpo["comparacao"]["anterior"]["data"] == _dia(60)[:10]
    assert client.get(f"/alunos/999/evolucao/exercicios/{exercicio_id}?periodo=30d",
                      headers=professor_headers).status_code == 404


def test_agrega_repeticoes_maximas_series_e_volume_por_dia(client, db, aluno_headers, aluno_id, item_id, exercicio_id):
    _registrar(db, aluno_id, item_id, "2026-03-02T09:00:00", 3, 12, 20)
    _registrar(db, aluno_id, item_id, "2026-03-02T09:30:00", 2, 8, 30)
    ponto = client.get(_url(exercicio_id), headers=aluno_headers).json()["pontos"][0]
    assert ponto["repeticoes_maximas"] == 12
    assert ponto["series"] == 5
    assert ponto["volume"] == 3 * 12 * 20 + 2 * 8 * 30
    assert ponto["carga_maxima"] == 30.0
    assert ponto["registros"] == 2


def test_comparacao_com_um_dia(client, db, aluno_headers, aluno_id, item_id, exercicio_id):
    _registrar(db, aluno_id, item_id, "2026-03-02T09:00:00", 1, 10, 20)
    comparacao = client.get(_url(exercicio_id), headers=aluno_headers).json()["comparacao"]
    assert comparacao["atual"]["data"] == "2026-03-02"
    assert comparacao["anterior"] is None


def test_comparacao_com_dois_dias_ignora_periodo(client, db, hoje_fixo, aluno_headers, aluno_id, item_id,
                                                 exercicio_id):
    _registrar(db, aluno_id, item_id, _dia(200), 1, 10, 20)
    _registrar(db, aluno_id, item_id, _dia(150), 1, 10, 25)
    _registrar(db, aluno_id, item_id, _dia(3), 1, 10, 30)
    corpo = client.get(_url(exercicio_id, "7d"), headers=aluno_headers).json()
    assert len(corpo["pontos"]) == 1
    assert corpo["comparacao"]["atual"]["data"] == _dia(3)[:10]
    assert corpo["comparacao"]["anterior"]["data"] == _dia(150)[:10]
    assert corpo["comparacao"]["anterior"]["carga_maxima"] == 25.0
