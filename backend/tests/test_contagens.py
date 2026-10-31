from sqlalchemy import event

from conftest import dia_hoje, engine_teste


def _novo_treino(client, headers, ficha_id, ordem, nome="Treino"):
    r = client.post(
        "/treino",
        json={"ficha_id": ficha_id, "nome": nome, "dia_semana": dia_hoje(), "ordem": ordem},
        headers=headers,
    )
    assert r.status_code == 200
    return r.json()


def _novo_item(client, headers, ficha_id, treino_id, exercicio_id, ordem):
    r = client.post(
        "/ficha/itens",
        json={"ficha_id": ficha_id, "treino_id": treino_id, "exercicio_id": exercicio_id,
              "series": 3, "repeticoes": 10, "carga": 20.0, "descanso": 60, "ordem": ordem},
        headers=headers,
    )
    assert r.status_code == 200


def _novo_exercicio(client, headers, nome):
    r = client.post("/exercicios", json={"nome": nome, "descricao": "d", "grupo_muscular": "peito"}, headers=headers)
    return r.json()["id"]


def test_ficha_nova_tem_zero_treinos(client, professor_headers, aluno_id):
    r = client.post("/ficha", json={"aluno_id": aluno_id, "nome": "Vazia"}, headers=professor_headers)
    assert r.json()["total_treinos"] == 0


def test_lista_de_fichas_traz_total_de_treinos_ativos(client, professor_headers, aluno_id, ficha_id):
    outra = client.post("/ficha", json={"aluno_id": aluno_id, "nome": "Outra"}, headers=professor_headers).json()["id"]
    _novo_treino(client, professor_headers, ficha_id, 1)
    _novo_treino(client, professor_headers, ficha_id, 2)
    removido = _novo_treino(client, professor_headers, ficha_id, 3)
    assert client.delete(f"/treino/{removido['id']}", headers=professor_headers).status_code == 200

    totais = {f["id"]: f["total_treinos"] for f in client.get("/ficha", headers=professor_headers).json()}
    assert totais == {ficha_id: 2, outra: 0}

    por_aluno = client.get(f"/ficha?aluno_id={aluno_id}", headers=professor_headers).json()
    assert {f["id"]: f["total_treinos"] for f in por_aluno} == totais

    resumo = client.get(f"/ficha/professor/{ficha_id}", headers=professor_headers).json()
    assert resumo["total_treinos"] == 2


def test_lista_de_fichas_conta_sem_n_mais_um(client, professor_headers, aluno_id):
    def consultas_da_listagem():
        comandos = []

        def registrar(conn, cursor, statement, *args):
            comandos.append(statement)

        event.listen(engine_teste, "before_cursor_execute", registrar)
        try:
            assert client.get("/ficha", headers=professor_headers).status_code == 200
        finally:
            event.remove(engine_teste, "before_cursor_execute", registrar)
        return len([c for c in comandos if c.lstrip().upper().startswith("SELECT")])

    for i in range(2):
        ficha = client.post("/ficha", json={"aluno_id": aluno_id, "nome": f"F{i}"}, headers=professor_headers).json()["id"]
        _novo_treino(client, professor_headers, ficha, 1)
    com_duas = consultas_da_listagem()

    for i in range(2, 6):
        ficha = client.post("/ficha", json={"aluno_id": aluno_id, "nome": f"F{i}"}, headers=professor_headers).json()["id"]
        _novo_treino(client, professor_headers, ficha, 1)
    assert consultas_da_listagem() == com_duas


def test_treinos_do_professor_trazem_total_de_itens_ativos(client, professor_headers, ficha_id, exercicio_id):
    cheio = _novo_treino(client, professor_headers, ficha_id, 1, "Cheio")
    vazio = _novo_treino(client, professor_headers, ficha_id, 2, "Vazio")
    assert cheio["total_itens"] == 0 and vazio["total_itens"] == 0

    segundo = _novo_exercicio(client, professor_headers, "Remada")
    terceiro = _novo_exercicio(client, professor_headers, "Rosca")
    _novo_item(client, professor_headers, ficha_id, cheio["id"], exercicio_id, 1)
    _novo_item(client, professor_headers, ficha_id, cheio["id"], segundo, 2)
    _novo_item(client, professor_headers, ficha_id, cheio["id"], terceiro, 3)
    item_extra = client.get(f"/ficha/itens/treino/{cheio['id']}", headers=professor_headers).json()[2]["id"]
    assert client.delete(f"/ficha/item/{item_extra}", headers=professor_headers).status_code == 200

    lista = client.get(f"/treino/ficha/{ficha_id}", headers=professor_headers).json()
    assert {t["id"]: t["total_itens"] for t in lista} == {cheio["id"]: 2, vazio["id"]: 0}

    r = client.put(
        f"/treino/{cheio['id']}",
        json={"nome": "Cheio B", "dia_semana": dia_hoje(), "ordem": 1},
        headers=professor_headers,
    )
    assert r.json()["total_itens"] == 2


def test_ficha_do_aluno_traz_total_de_itens_por_treino(client, aluno_headers, professor_headers, ficha_id, treino_id, item_id):
    vazio = _novo_treino(client, professor_headers, ficha_id, 2, "Vazio")
    treinos = client.get(f"/ficha/{ficha_id}", headers=aluno_headers).json()["treinos"]
    assert {t["id"]: t["total_itens"] for t in treinos} == {treino_id: 1, vazio["id"]: 0}
