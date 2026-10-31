from datetime import timedelta

from app.models import Ficha, HistoricoExecucao, ItemFicha, SessaoTreino


def _iniciar(client, headers, treino_id):
    return client.post("/sessoes", json={"treino_id": treino_id}, headers=headers)


def _execucao(item_id, carga=20.0, reps=10, series=1):
    return {"item_ficha_id": item_id, "series_realizadas": series,
            "repeticoes_realizadas": reps, "carga_utilizada": carga}


def test_iniciar_sessao(client, aluno_headers, treino_id, ficha_id):
    r = _iniciar(client, aluno_headers, treino_id)
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["treino_id"] == treino_id
    assert corpo["treino_nome"] == "Treino A"
    assert corpo["ficha_id"] == ficha_id
    assert corpo["finalizada_em"] is None
    assert corpo["total_execucoes"] == 0
    assert corpo["execucoes"] == []


def test_iniciar_sessao_devolve_a_aberta(client, aluno_headers, treino_id):
    primeira = _iniciar(client, aluno_headers, treino_id).json()
    segunda = _iniciar(client, aluno_headers, treino_id).json()
    assert primeira["id"] == segunda["id"]


def test_iniciar_depois_de_finalizar_cria_nova(client, aluno_headers, treino_id):
    primeira = _iniciar(client, aluno_headers, treino_id).json()
    client.post(f"/sessoes/{primeira['id']}/finalizar", json={}, headers=aluno_headers)
    segunda = _iniciar(client, aluno_headers, treino_id).json()
    assert segunda["id"] != primeira["id"]


def test_iniciar_sessao_permissoes_e_404(client, professor_headers, outro_aluno_headers, aluno_headers, treino_id):
    assert _iniciar(client, professor_headers, treino_id).status_code == 403
    assert _iniciar(client, outro_aluno_headers, treino_id).status_code == 404  # ficha de outro aluno
    assert _iniciar(client, aluno_headers, 999).status_code == 404
    assert client.post("/sessoes", json={}, headers=aluno_headers).status_code == 422
    assert client.post("/sessoes", json={"treino_id": treino_id}).status_code in (401, 403)


def test_iniciar_sessao_treino_ou_ficha_inativos_404(client, db, professor_headers, aluno_headers, treino_id, ficha_id):
    client.delete(f"/treino/{treino_id}", headers=professor_headers)
    assert _iniciar(client, aluno_headers, treino_id).status_code == 404


def test_registrar_execucoes_em_lote(client, aluno_headers, treino_id, item_id):
    sessao = _iniciar(client, aluno_headers, treino_id).json()
    r = client.post(f"/sessoes/{sessao['id']}/execucoes",
                    json={"execucoes": [_execucao(item_id, 20), _execucao(item_id, 25, 8)]}, headers=aluno_headers)
    assert r.status_code == 200
    criados = r.json()
    assert len(criados) == 2
    assert criados[0]["sessao_id"] == sessao["id"]
    assert criados[0]["exercicio_nome"] == "Supino"
    assert criados[0]["item_ficha_id"] == item_id
    assert "exercicio_id" in criados[0]

    detalhe = client.get(f"/sessoes/{sessao['id']}", headers=aluno_headers).json()
    assert detalhe["total_execucoes"] == 2
    assert len(detalhe["execucoes"]) == 2


def test_registrar_execucoes_validacoes(client, aluno_headers, treino_id, item_id):
    sessao = _iniciar(client, aluno_headers, treino_id).json()
    url = f"/sessoes/{sessao['id']}/execucoes"
    assert client.post(url, json={"execucoes": []}, headers=aluno_headers).status_code == 422
    assert client.post(url, json={"execucoes": [_execucao(item_id)] * 51}, headers=aluno_headers).status_code == 422
    assert client.post(url, json={"execucoes": [_execucao(item_id, series=0)]}, headers=aluno_headers).status_code == 422
    assert client.post(url, json={"execucoes": [_execucao(item_id, carga=-1)]}, headers=aluno_headers).status_code == 422


def test_registrar_execucoes_item_de_outro_treino_404_e_nada_gravado(client, db, professor_headers, aluno_headers,
                                                                      ficha_id, treino_id, item_id, exercicio_id):
    outro_treino = client.post("/treino", json={"ficha_id": ficha_id, "nome": "B", "dia_semana": "terça", "ordem": 2},
                               headers=professor_headers).json()["id"]
    item_b = client.post("/ficha/itens", json={"ficha_id": ficha_id, "treino_id": outro_treino, "exercicio_id": exercicio_id,
                                               "series": 3, "repeticoes": 10, "carga": 5, "descanso": 30, "ordem": 1},
                         headers=professor_headers).json()["id"]
    sessao = _iniciar(client, aluno_headers, treino_id).json()

    r = client.post(f"/sessoes/{sessao['id']}/execucoes",
                    json={"execucoes": [_execucao(item_id), _execucao(item_b)]}, headers=aluno_headers)
    assert r.status_code == 404
    assert r.json()["detail"] == "Item da ficha não encontrado"
    assert db.query(HistoricoExecucao).count() == 0  # transação única


def test_registrar_execucoes_item_inativo_404(client, db, professor_headers, aluno_headers, treino_id, item_id):
    sessao = _iniciar(client, aluno_headers, treino_id).json()
    db.get(ItemFicha, item_id).ativo = False
    db.commit()
    r = client.post(f"/sessoes/{sessao['id']}/execucoes", json={"execucoes": [_execucao(item_id)]}, headers=aluno_headers)
    assert r.status_code == 404


def test_registrar_execucoes_permissoes_e_404(client, professor_headers, outro_aluno_headers, aluno_headers, treino_id, item_id):
    sessao = _iniciar(client, aluno_headers, treino_id).json()
    url = f"/sessoes/{sessao['id']}/execucoes"
    corpo = {"execucoes": [_execucao(item_id)]}
    assert client.post(url, json=corpo, headers=professor_headers).status_code == 403
    assert client.post(url, json=corpo, headers=outro_aluno_headers).status_code == 404
    assert client.post("/sessoes/999/execucoes", json=corpo, headers=aluno_headers).status_code == 404


def test_finalizar_sessao(client, aluno_headers, treino_id, item_id):
    sessao = _iniciar(client, aluno_headers, treino_id).json()
    client.post(f"/sessoes/{sessao['id']}/execucoes", json={"execucoes": [_execucao(item_id)]}, headers=aluno_headers)
    r = client.post(f"/sessoes/{sessao['id']}/finalizar", json={"esforco": 7, "comentario": "Pesado"}, headers=aluno_headers)
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["finalizada_em"] is not None
    assert (corpo["esforco"], corpo["comentario"], corpo["total_execucoes"]) == (7, "Pesado", 1)


def test_finalizar_sem_corpo(client, aluno_headers, treino_id):
    sessao = _iniciar(client, aluno_headers, treino_id).json()
    r = client.post(f"/sessoes/{sessao['id']}/finalizar", headers=aluno_headers)
    assert r.status_code == 200
    assert r.json()["esforco"] is None


def test_finalizar_validacoes(client, aluno_headers, treino_id):
    sessao = _iniciar(client, aluno_headers, treino_id).json()
    url = f"/sessoes/{sessao['id']}/finalizar"
    assert client.post(url, json={"esforco": 0}, headers=aluno_headers).status_code == 422
    assert client.post(url, json={"esforco": 11}, headers=aluno_headers).status_code == 422
    assert client.post(url, json={"comentario": "x" * 501}, headers=aluno_headers).status_code == 422


def test_finalizar_duas_vezes_409_e_execucoes_em_finalizada_409(client, aluno_headers, treino_id, item_id):
    sessao = _iniciar(client, aluno_headers, treino_id).json()
    url = f"/sessoes/{sessao['id']}/finalizar"
    assert client.post(url, json={}, headers=aluno_headers).status_code == 200
    r = client.post(url, json={}, headers=aluno_headers)
    assert r.status_code == 409
    assert r.json()["detail"] == "Sessão já finalizada"
    r = client.post(f"/sessoes/{sessao['id']}/execucoes", json={"execucoes": [_execucao(item_id)]}, headers=aluno_headers)
    assert r.status_code == 409
    assert r.json()["detail"] == "Sessão já finalizada"


def test_finalizar_permissoes_e_404(client, professor_headers, outro_aluno_headers, aluno_headers, treino_id):
    sessao = _iniciar(client, aluno_headers, treino_id).json()
    url = f"/sessoes/{sessao['id']}/finalizar"
    assert client.post(url, json={}, headers=professor_headers).status_code == 403
    assert client.post(url, json={}, headers=outro_aluno_headers).status_code == 404
    assert client.post("/sessoes/999/finalizar", json={}, headers=aluno_headers).status_code == 404


def test_listar_sessoes_do_aluno(client, professor_headers, outro_aluno_headers, aluno_headers, treino_id):
    primeira = _iniciar(client, aluno_headers, treino_id).json()
    client.post(f"/sessoes/{primeira['id']}/finalizar", json={}, headers=aluno_headers)
    segunda = _iniciar(client, aluno_headers, treino_id).json()

    lista = client.get("/sessoes", headers=aluno_headers).json()
    assert [s["id"] for s in lista] == [segunda["id"], primeira["id"]]
    assert "execucoes" not in lista[0]
    assert client.get("/sessoes", headers=outro_aluno_headers).json() == []
    assert client.get("/sessoes", headers=professor_headers).status_code == 403


def test_obter_sessao_por_aluno_professor_e_negados(client, professor_headers, outro_professor_headers,
                                                    outro_aluno_headers, aluno_headers, admin_headers, treino_id):
    sessao = _iniciar(client, aluno_headers, treino_id).json()
    url = f"/sessoes/{sessao['id']}"
    assert client.get(url, headers=aluno_headers).status_code == 200
    assert client.get(url, headers=professor_headers).status_code == 200
    assert client.get(url, headers=outro_professor_headers).status_code == 200  # ADR-022
    assert client.get(url, headers=outro_aluno_headers).status_code == 404
    assert client.get(url, headers=admin_headers).status_code == 403
    assert client.get("/sessoes/999", headers=aluno_headers).status_code == 404
    assert client.get("/sessoes/999", headers=professor_headers).status_code == 404


def test_post_ficha_treino_com_sessao_id(client, db, aluno_headers, outro_aluno_headers, treino_id, item_id):
    sessao = _iniciar(client, aluno_headers, treino_id).json()
    corpo = {"item_ficha_id": item_id, "data_execucao": "2026-01-10T10:00:00", "series_realizadas": 3,
             "repeticoes_realizadas": 10, "carga_utilizada": 20, "observacao": None, "sessao_id": sessao["id"]}
    assert client.post("/ficha/treino", json=corpo, headers=aluno_headers).status_code == 200
    assert db.query(HistoricoExecucao).one().sessao_id == sessao["id"]

    historico = client.get("/ficha/progresso", headers=aluno_headers).json()[0]
    assert historico["sessao_id"] == sessao["id"]
    assert historico["exercicio_nome"] == "Supino"

    # sessão de outro aluno → 404; sessão inexistente → 404
    assert client.post("/ficha/treino", json=corpo, headers=outro_aluno_headers).status_code == 404
    assert client.post("/ficha/treino", json={**corpo, "sessao_id": 999}, headers=aluno_headers).status_code == 404

    client.post(f"/sessoes/{sessao['id']}/finalizar", json={}, headers=aluno_headers)
    assert client.post("/ficha/treino", json=corpo, headers=aluno_headers).status_code == 409


def test_post_ficha_treino_sem_sessao_continua_valendo(client, aluno_headers, item_id):
    corpo = {"item_ficha_id": item_id, "data_execucao": "2026-01-10T10:00:00", "series_realizadas": 3,
             "repeticoes_realizadas": 10, "carga_utilizada": 20, "observacao": None}
    assert client.post("/ficha/treino", json=corpo, headers=aluno_headers).status_code == 200
    assert client.get("/ficha/progresso", headers=aluno_headers).json()[0]["sessao_id"] is None


def test_lista_de_sessoes_traz_resumo_agregado(client, db, aluno_headers, professor_headers, aluno_id, treino_id, item_id):
    # Sessão finalizada com duas execuções: séries 2 e 3; volume 2*10*20 + 3*8*25 = 1000
    sessao = _iniciar(client, aluno_headers, treino_id).json()
    client.post(f"/sessoes/{sessao['id']}/execucoes", headers=aluno_headers, json={"execucoes": [
        _execucao(item_id, carga=20, reps=10, series=2), _execucao(item_id, carga=25, reps=8, series=3)]})
    client.post(f"/sessoes/{sessao['id']}/finalizar", json={}, headers=aluno_headers)
    # Duração conhecida: 90 s
    registro = db.get(SessaoTreino, sessao["id"])
    registro.finalizada_em = registro.iniciada_em + timedelta(seconds=90)
    db.commit()
    # Sessão aberta, sem execuções
    aberta = _iniciar(client, aluno_headers, treino_id).json()

    for lista in (
        client.get("/sessoes", headers=aluno_headers).json(),
        client.get(f"/alunos/{aluno_id}/sessoes", headers=professor_headers).json(),
    ):
        por_id = {s["id"]: s for s in lista}
        fechada = por_id[sessao["id"]]
        assert fechada["total_execucoes"] == 2
        assert fechada["total_series"] == 5
        assert fechada["volume_total"] == 1000.0
        assert fechada["duracao_segundos"] == 90
        vazia = por_id[aberta["id"]]
        assert vazia["total_execucoes"] == 0
        assert vazia["total_series"] == 0
        assert vazia["volume_total"] == 0.0
        assert vazia["duracao_segundos"] is None

    # O detalhe traz os mesmos campos
    detalhe = client.get(f"/sessoes/{sessao['id']}", headers=aluno_headers).json()
    assert (detalhe["total_series"], detalhe["volume_total"], detalhe["duracao_segundos"]) == (5, 1000.0, 90)


def test_lista_de_sessoes_resumo_em_numero_fixo_de_queries(client, db, aluno_headers, treino_id, item_id):
    from sqlalchemy import event

    def criar_sessao_finalizada():
        s = _iniciar(client, aluno_headers, treino_id).json()
        client.post(f"/sessoes/{s['id']}/execucoes", json={"execucoes": [_execucao(item_id)]}, headers=aluno_headers)
        client.post(f"/sessoes/{s['id']}/finalizar", json={}, headers=aluno_headers)

    def contar():
        consultas = []
        motor = db.get_bind()
        escutar = lambda *a: consultas.append(1)
        event.listen(motor, "before_cursor_execute", escutar)
        try:
            assert client.get("/sessoes", headers=aluno_headers).status_code == 200
        finally:
            event.remove(motor, "before_cursor_execute", escutar)
        return len(consultas)

    criar_sessao_finalizada()
    antes = contar()
    for _ in range(3):
        criar_sessao_finalizada()
    assert contar() == antes


def test_listar_sessoes_com_paginacao(client, professor_headers, aluno_id, aluno_headers, treino_id):
    ids = []
    for _ in range(5):
        sessao = _iniciar(client, aluno_headers, treino_id).json()
        client.post(f"/sessoes/{sessao['id']}/finalizar", json={}, headers=aluno_headers)
        ids.append(sessao["id"])
    esperado = list(reversed(ids))  # mais recente primeiro

    def pegar(url, **params):
        return [s["id"] for s in client.get(url, params=params, headers=headers_por_url[url]).json()]

    headers_por_url = {"/sessoes": aluno_headers, f"/alunos/{aluno_id}/sessoes": professor_headers}

    for url in headers_por_url:
        assert pegar(url) == esperado  # sem parâmetros: tudo (contrato anterior)
        assert pegar(url, limite=2) == esperado[:2]
        assert pegar(url, limite=2, deslocamento=2) == esperado[2:4]
        assert pegar(url, limite=2, deslocamento=4) == esperado[4:]
        assert pegar(url, deslocamento=3) == esperado[3:]
        assert pegar(url, limite=2, deslocamento=10) == []

    for invalido in ({"limite": 0}, {"limite": 201}, {"deslocamento": -1}, {"limite": "x"}):
        assert client.get("/sessoes", params=invalido, headers=aluno_headers).status_code == 422
        assert client.get(f"/alunos/{aluno_id}/sessoes", params=invalido, headers=professor_headers).status_code == 422
