from conftest import dia_hoje


def _item(ficha_id, treino_id, exercicio_id, ordem=1):
    return {"ficha_id": ficha_id, "treino_id": treino_id, "exercicio_id": exercicio_id,
            "series": 3, "repeticoes": 10, "carga": 20.0, "descanso": 60, "ordem": ordem}


def _execucao(item_id, data="2026-01-10T10:00:00", observacao=None):
    return {"item_ficha_id": item_id, "data_execucao": data, "series_realizadas": 3,
            "repeticoes_realizadas": 10, "carga_utilizada": 22.5, "observacao": observacao}


def test_criar_ficha_aluno_inexistente(client, professor_headers):
    r = client.post("/ficha", json={"aluno_id": 999, "nome": "x"}, headers=professor_headers)
    assert r.status_code == 404
    assert r.json()["detail"] == "Aluno não encontrado"


def test_ficha_treino_item_fluxo(client, professor_headers, ficha_id, treino_id, exercicio_id):
    r = client.get("/ficha", headers=professor_headers)
    assert [f["id"] for f in r.json()] == [ficha_id]
    assert r.json()[0]["aluno_nome"] == "Aluno"

    r = client.get(f"/treino/ficha/{ficha_id}", headers=professor_headers)
    assert r.json()[0]["id"] == treino_id

    r = client.post("/ficha/itens", json=_item(ficha_id, treino_id, exercicio_id), headers=professor_headers)
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["nome"] == "Supino"
    assert corpo["grupo_muscular"] == "peito"
    assert corpo["imagem"] is None

    r = client.get(f"/ficha/itens/treino/{treino_id}", headers=professor_headers)
    assert [i["nome"] for i in r.json()] == ["Supino"]


def test_item_duplicado_e_ordem_conflitam(client, professor_headers, ficha_id, treino_id, exercicio_id, item_id):
    r = client.post("/ficha/itens", json=_item(ficha_id, treino_id, exercicio_id, ordem=2), headers=professor_headers)
    assert r.status_code == 409
    assert r.json()["detail"] == "Exercício já cadastrado neste treino"

    outro = client.post("/exercicios", json={"nome": "Remada", "descricao": "d", "grupo_muscular": "costas"}, headers=professor_headers).json()["id"]
    r = client.post("/ficha/itens", json=_item(ficha_id, treino_id, outro, ordem=1), headers=professor_headers)
    assert r.status_code == 409
    assert r.json()["detail"] == "Já existe um exercício com esta ordem neste treino"

    r = client.post("/ficha/itens", json=_item(ficha_id, treino_id, outro, ordem=2), headers=professor_headers)
    assert r.status_code == 200


def test_treino_ordem_conflita(client, professor_headers, ficha_id, treino_id):
    r = client.post("/treino", json={"ficha_id": ficha_id, "nome": "B", "dia_semana": "segunda", "ordem": 1}, headers=professor_headers)
    assert r.status_code == 409
    assert r.json()["detail"] == "Já existe um treino com esta ordem nesta ficha"


def test_professor_nao_dono_recebe_403(client, outro_professor_headers, ficha_id, treino_id, exercicio_id, item_id):
    h = outro_professor_headers
    r = client.post("/treino", json={"ficha_id": ficha_id, "nome": "B", "dia_semana": "segunda", "ordem": 2}, headers=h)
    assert r.status_code == 403
    r = client.post("/ficha/itens", json=_item(ficha_id, treino_id, exercicio_id, ordem=5), headers=h)
    assert r.status_code == 403
    assert r.json()["detail"] == "Você não é o professor responsável por esta ficha"
    assert client.put(f"/ficha/{ficha_id}", json={"nome": "x"}, headers=h).status_code == 403
    assert client.delete(f"/ficha/{ficha_id}", headers=h).status_code == 403
    assert client.delete(f"/treino/{treino_id}", headers=h).status_code == 403
    corpo = {"series": 1, "repeticoes": 1, "carga": 1, "descanso": 1, "ordem": 1}
    assert client.put(f"/ficha/item/{item_id}", json=corpo, headers=h).status_code == 403
    assert client.delete(f"/ficha/item/{item_id}", headers=h).status_code == 403
    assert client.get(f"/ficha/itens/treino/{treino_id}", headers=h).status_code == 403


def test_atualizar_item(client, professor_headers, item_id):
    corpo = {"series": 5, "repeticoes": 8, "carga": 30.0, "descanso": 90, "ordem": 2}
    r = client.put(f"/ficha/item/{item_id}", json=corpo, headers=professor_headers)
    assert r.status_code == 200
    assert r.json()["series"] == 5 and r.json()["ordem"] == 2


def test_ficha_do_aluno(client, aluno_headers, ficha_id, treino_id, item_id):
    r = client.get(f"/ficha/{ficha_id}", headers=aluno_headers)
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["id"] == ficha_id and corpo["nome"] == "Ficha A"
    assert len(corpo["treinos"]) == 1
    treino = corpo["treinos"][0]
    assert treino["dia_semana"] == dia_hoje()
    assert [i["id"] for i in treino["itens"]] == [item_id]

    r = client.get("/ficha/aluno", headers=aluno_headers)
    assert r.status_code == 200 and r.json()[0]["id"] == ficha_id


def test_ficha_inexistente_404(client, aluno_headers):
    assert client.get("/ficha/999", headers=aluno_headers).status_code == 404


def test_treino_de_hoje(client, aluno_headers, professor_headers, ficha_id, treino_id, item_id):
    # treino em outro dia não aparece
    outro_dia = "segunda" if dia_hoje() != "segunda" else "terça"
    client.post("/treino", json={"ficha_id": ficha_id, "nome": "Outro", "dia_semana": outro_dia, "ordem": 2}, headers=professor_headers)

    r = client.get(f"/treino/hoje/{ficha_id}", headers=aluno_headers)
    assert r.status_code == 200
    corpo = r.json()
    assert [t["id"] for t in corpo] == [treino_id]
    assert corpo[0]["itens"][0]["nome"] == "Supino"


def test_treino_de_hoje_sem_treinos(client, aluno_headers, ficha_id):
    r = client.get(f"/treino/hoje/{ficha_id}", headers=aluno_headers)
    assert r.status_code == 200
    assert r.json() == []


def test_historico_e_progresso(client, aluno_headers, item_id):
    r = client.get("/ficha/progresso", headers=aluno_headers)
    assert r.status_code == 200
    assert r.json() == []

    assert client.post("/ficha/treino", json=_execucao(item_id), headers=aluno_headers).status_code == 200
    r = client.post("/ficha/treino", json=_execucao(item_id, "2026-01-12T10:00:00", "leve"), headers=aluno_headers)
    assert r.status_code == 200

    r = client.get("/ficha/progresso", headers=aluno_headers)
    assert r.status_code == 200
    assert [h["observacao"] for h in r.json()] == ["leve", None]  # mais recente primeiro


def test_historico_item_inexistente(client, aluno_headers):
    assert client.post("/ficha/treino", json=_execucao(999), headers=aluno_headers).status_code == 404


def test_exclusao_logica_de_treino(client, db, professor_headers, ficha_id, treino_id, item_id):
    from app.models import Treino, ItemFicha
    r = client.delete(f"/treino/{treino_id}", headers=professor_headers)
    assert r.status_code == 200
    assert client.get(f"/treino/ficha/{ficha_id}", headers=professor_headers).json() == []
    assert db.get(Treino, treino_id).ativo is False
    assert db.get(ItemFicha, item_id).ativo is False
    assert client.delete(f"/treino/{treino_id}", headers=professor_headers).status_code == 404


def test_exclusao_logica_de_ficha(client, db, professor_headers, aluno_headers, ficha_id, treino_id, item_id):
    from app.models import Ficha, Treino, ItemFicha
    r = client.delete(f"/ficha/{ficha_id}", headers=professor_headers)
    assert r.status_code == 200
    assert db.get(Ficha, ficha_id).ativo is False
    assert db.get(Treino, treino_id).ativo is False
    assert db.get(ItemFicha, item_id).ativo is False
    assert client.get("/ficha", headers=professor_headers).json() == []
    r = client.get("/ficha/aluno", headers=aluno_headers)
    assert r.status_code == 200
    assert r.json() == []


def test_exclusao_de_item_com_historico_e_logica(client, db, professor_headers, aluno_headers, item_id):
    from app.models import ItemFicha
    assert client.post("/ficha/treino", json=_execucao(item_id), headers=aluno_headers).status_code == 200
    assert client.delete(f"/ficha/item/{item_id}", headers=professor_headers).status_code == 200
    assert db.get(ItemFicha, item_id).ativo is False


def test_ficha_do_aluno_traz_dados_do_exercicio_nos_itens(client, aluno_headers, ficha_id, item_id):
    treino = client.get(f"/ficha/{ficha_id}", headers=aluno_headers).json()["treinos"][0]
    item = treino["itens"][0]
    assert item["nome"] == "Supino"
    assert item["descricao"] == "Peito"
    assert item["grupo_muscular"] == "peito"
    assert item["imagem"] is None and item["video"] is None
    assert item["exercicio_id"] and item["series"] == 3


def test_ficha_do_aluno_traz_professor_nome(client, aluno_headers, professor_headers, ficha_id):
    lista = client.get("/ficha/aluno", headers=aluno_headers).json()
    assert lista[0]["professor_nome"] == "Professor"
    detalhe = client.get(f"/ficha/{ficha_id}", headers=aluno_headers).json()
    assert detalhe["professor_nome"] == "Professor"
