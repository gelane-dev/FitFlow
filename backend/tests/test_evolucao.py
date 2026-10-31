from datetime import datetime

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
        {"data": "2026-03-02", "carga_maxima": 25.0, "volume": 1 * 10 * 20 + 1 * 8 * 25, "registros": 2},
        {"data": "2026-03-09", "carga_maxima": 30.0, "volume": 3 * 10 * 30, "registros": 1},
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
