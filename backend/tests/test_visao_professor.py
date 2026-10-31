from app.models import HistoricoExecucao


def _executar(client, aluno_headers, treino_id, item_id):
    sessao = client.post("/sessoes", json={"treino_id": treino_id}, headers=aluno_headers).json()
    client.post(f"/sessoes/{sessao['id']}/execucoes",
                json={"execucoes": [{"item_ficha_id": item_id, "series_realizadas": 1,
                                     "repeticoes_realizadas": 10, "carga_utilizada": 20}]},
                headers=aluno_headers)
    return sessao["id"]


def test_obter_aluno(client, professor_headers, outro_professor_headers, aluno_headers, aluno_id):
    for headers in (professor_headers, outro_professor_headers):
        r = client.get(f"/alunos/{aluno_id}", headers=headers)
        assert r.status_code == 200
        assert r.json()["id"] == aluno_id
        assert r.json()["nome"] == "Aluno"
    assert client.get("/alunos/999", headers=professor_headers).status_code == 404
    assert client.get("/alunos/999", headers=professor_headers).json()["detail"] == "Aluno não encontrado"
    assert client.get(f"/alunos/{aluno_id}", headers=aluno_headers).status_code == 403


def test_listar_alunos_continua_funcionando(client, professor_headers, aluno_id):
    assert [a["id"] for a in client.get("/alunos", headers=professor_headers).json()] == [aluno_id]


def test_historico_do_aluno(client, db, professor_headers, outro_professor_headers, aluno_headers, aluno_id,
                            treino_id, item_id):
    sessao_id = _executar(client, aluno_headers, treino_id, item_id)
    _executar(client, aluno_headers, treino_id, item_id)  # devolve a mesma sessão aberta

    for headers in (professor_headers, outro_professor_headers):
        r = client.get(f"/alunos/{aluno_id}/historico", headers=headers)
        assert r.status_code == 200
        corpo = r.json()
        assert len(corpo) == 2
        assert corpo[0]["sessao_id"] == sessao_id
        assert corpo[0]["exercicio_nome"] == "Supino"
        datas = [h["data_execucao"] for h in corpo]
        assert datas == sorted(datas, reverse=True)

    assert client.get(f"/alunos/{aluno_id}/historico", headers=aluno_headers).status_code == 403
    assert client.get("/alunos/999/historico", headers=professor_headers).status_code == 404


def test_historico_do_aluno_vazio(client, professor_headers, aluno_id):
    assert client.get(f"/alunos/{aluno_id}/historico", headers=professor_headers).json() == []


def test_historico_nao_mistura_alunos(client, db, professor_headers, outro_aluno_headers, aluno_headers, aluno_id,
                                      treino_id, item_id):
    from app.models import Aluno
    _executar(client, aluno_headers, treino_id, item_id)
    outro = db.query(Aluno).filter(Aluno.nome == "Aluno 2").one().id
    assert client.get(f"/alunos/{outro}/historico", headers=professor_headers).json() == []
    assert db.query(HistoricoExecucao).count() == 1


def test_sessoes_do_aluno(client, professor_headers, aluno_headers, aluno_id, treino_id, item_id):
    sessao_id = _executar(client, aluno_headers, treino_id, item_id)
    r = client.get(f"/alunos/{aluno_id}/sessoes", headers=professor_headers)
    assert r.status_code == 200
    assert [s["id"] for s in r.json()] == [sessao_id]
    assert r.json()[0]["total_execucoes"] == 1
    assert client.get(f"/alunos/{aluno_id}/sessoes", headers=aluno_headers).status_code == 403
    assert client.get("/alunos/999/sessoes", headers=professor_headers).status_code == 404
