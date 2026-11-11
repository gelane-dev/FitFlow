"""TD-67: PUT /ficha/{id}/completa salva a ficha inteira numa única transação."""
from conftest import _criar_usuario, _headers, vincular
from app.core.tempo import agora_naive
from app.models import Auditoria, HistoricoExecucao, ItemFicha, Treino


def _exercicio(client, headers, nome):
    r = client.post("/exercicios", json={"nome": nome, "descricao": "d", "grupo_muscular": "peito"}, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _item(exercicio_id, ordem=1, id=None, **extra):
    corpo = {"exercicio_id": exercicio_id, "series": 3, "repeticoes": 10, "carga": 20.0, "descanso": 60,
             "ordem": ordem, **extra}
    if id is not None:
        corpo["id"] = id
    return corpo


def _corpo(treinos, **extra):
    return {"nome": "Ficha A", "treinos": treinos, **extra}


def _treino(itens, ordem=1, id=None, nome=None, dia_semana=None):
    corpo = {"nome": nome or f"Treino {ordem}", "dia_semana": dia_semana, "ordem": ordem, "itens": itens}
    if id is not None:
        corpo["id"] = id
    return corpo


def _estado(client, headers, ficha_id):
    r = client.get(f"/ficha/{ficha_id}/completa", headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


def test_cria_atualiza_remove_e_reordena_num_so_put(
    client, db, professor_headers, ficha_id, treino_id, item_id, exercicio_id
):
    remada = _exercicio(client, professor_headers, "Remada")
    agacho = _exercicio(client, professor_headers, "Agachamento")
    extra = client.post("/ficha/itens", json={
        "ficha_id": ficha_id, "treino_id": treino_id, "exercicio_id": remada, "series": 3, "repeticoes": 10,
        "carga": 0, "descanso": 60, "ordem": 2}, headers=professor_headers).json()["id"]
    segundo = client.post("/treino", json={"ficha_id": ficha_id, "nome": "Treino B", "ordem": 2},
                          headers=professor_headers).json()["id"]

    corpo = _corpo([
        # treino B vira o primeiro e perde o dia; treino A vira o segundo, com 3 itens reordenados
        _treino([_item(agacho, 1)], ordem=1, id=segundo, nome="Pernas", dia_semana="sexta"),
        _treino([_item(remada, 1, id=extra), _item(exercicio_id, 2, id=item_id, series=5), _item(agacho, 3)],
                ordem=2, id=treino_id),
        _treino([_item(exercicio_id, 1)], ordem=3, nome="Novo"),
    ], nome="Renomeada", objetivo="Força")
    r = client.put(f"/ficha/{ficha_id}/completa", json=corpo, headers=professor_headers)

    assert r.status_code == 200, r.text
    ficha = r.json()
    assert ficha["nome"] == "Renomeada" and ficha["objetivo"] == "Força"
    assert [t["nome"] for t in ficha["treinos"]] == ["Pernas", "Treino 2", "Novo"]
    assert ficha["treinos"][0]["dia_semana"] == "sexta"
    a = ficha["treinos"][1]
    assert [(i["id"], i["ordem"]) for i in a["itens"][:2]] == [(extra, 1), (item_id, 2)]
    assert a["itens"][1]["series"] == 5 and len(a["itens"]) == 3
    assert ficha["treinos"][2]["id"] not in (treino_id, segundo)
    assert ficha == _estado(client, professor_headers, ficha_id)

    # remover: o treino "Novo" some do estado; o item de A também
    corpo["treinos"] = [corpo["treinos"][0], _treino([_item(remada, 1, id=extra)], ordem=2, id=treino_id)]
    r = client.put(f"/ficha/{ficha_id}/completa", json=corpo, headers=professor_headers)
    assert r.status_code == 200, r.text
    assert [t["nome"] for t in r.json()["treinos"]] == ["Pernas", "Treino 2"]
    assert [i["id"] for i in r.json()["treinos"][1]["itens"]] == [extra]
    # exclusão lógica do treino removido
    assert db.query(Treino).filter(Treino.ficha_id == ficha_id, Treino.ativo.is_(False)).count() == 1


def test_nao_muda_status_nem_cria_versao(client, professor_headers, ficha_id, treino_id, item_id, exercicio_id):
    antes = client.get(f"/ficha/{ficha_id}/versoes", headers=professor_headers).json()
    r = client.put(f"/ficha/{ficha_id}/completa", json=_corpo([_treino([_item(exercicio_id)], id=treino_id)]),
                   headers=professor_headers)

    assert r.status_code == 200
    assert r.json()["status"] == "publicada"
    assert client.get(f"/ficha/{ficha_id}/versoes", headers=professor_headers).json() == antes


def test_atomicidade_exercicio_invalido_no_ultimo_item_nao_grava_nada(
    client, db, professor_headers, ficha_id, treino_id, item_id, exercicio_id
):
    antes = _estado(client, professor_headers, ficha_id)
    total_auditoria = db.query(Auditoria).count()
    corpo = _corpo([
        _treino([_item(exercicio_id, 1, id=item_id, series=9), _item(exercicio_id, 2), _item(99999, 3)],
                id=treino_id, nome="Mudou"),
        _treino([_item(exercicio_id, 1)], ordem=2),
    ], nome="Outro nome")

    r = client.put(f"/ficha/{ficha_id}/completa", json=corpo, headers=professor_headers)

    assert r.status_code == 404
    assert r.json()["detail"] == "Exercicio não encontrado"
    db.expire_all()
    assert _estado(client, professor_headers, ficha_id) == antes
    assert db.query(Auditoria).count() == total_auditoria
    assert db.query(Treino).filter(Treino.ficha_id == ficha_id).count() == 1


def test_falha_no_meio_do_service_desfaz_tudo(client, db, professor_headers, ficha_id, treino_id, item_id,
                                             exercicio_id, monkeypatch):
    """Erro inesperado depois de flushes parciais: o rollback do router desfaz tudo."""
    from app.routers import fichas as router_fichas

    antes = _estado(client, professor_headers, ficha_id)

    def quebrar(*args, **kwargs):
        raise RuntimeError("falha simulada")

    monkeypatch.setattr(router_fichas, "registrar_alteracao", quebrar)
    corpo = _corpo([_treino([_item(exercicio_id, 1, id=item_id, series=9)], id=treino_id, nome="Mudou"),
                    _treino([_item(exercicio_id, 1)], ordem=2)], nome="Outro")
    from fastapi.testclient import TestClient
    cliente = TestClient(client.app, raise_server_exceptions=False)
    r = cliente.put(f"/ficha/{ficha_id}/completa", json=corpo, headers=professor_headers)

    assert r.status_code == 500
    db.expire_all()
    assert _estado(client, professor_headers, ficha_id) == antes


def test_permissoes(client, db, professor_headers, outro_professor_headers, aluno_headers, admin_headers,
                    ficha_id, treino_id, item_id, exercicio_id):
    corpo = _corpo([_treino([_item(exercicio_id, 1, id=item_id)], id=treino_id)], nome="Pelo admin")

    # professor sem vínculo: mesmo 403 das rotas de escrita atuais
    r = client.put(f"/ficha/{ficha_id}/completa", json=corpo, headers=outro_professor_headers)
    assert r.status_code == 403
    assert r.json()["detail"] == "Você não tem permissão para alterar esta ficha de treino"
    assert client.put(f"/ficha/{ficha_id}", json={"nome": "x"}, headers=outro_professor_headers).status_code == 403

    assert client.put(f"/ficha/{ficha_id}/completa", json=corpo, headers=aluno_headers).status_code == 403
    assert client.put(f"/ficha/{ficha_id}/completa", json=corpo).status_code in (401, 403)
    assert client.put("/ficha/99999/completa", json=corpo, headers=professor_headers).status_code == 404

    r = client.put(f"/ficha/{ficha_id}/completa", json=corpo, headers=admin_headers)
    assert r.status_code == 200 and r.json()["nome"] == "Pelo admin"


def test_professor_com_aluno_desvinculado_nao_edita(client, db, professor_headers, ficha_id, exercicio_id):
    from app.models import Aluno
    aluno = db.query(Aluno).one()
    aluno.professor_id = None
    db.commit()

    r = client.put(f"/ficha/{ficha_id}/completa", json=_corpo([]), headers=professor_headers)

    assert r.status_code == 403


def test_item_ou_treino_de_outra_ficha_e_erro(client, db, professor_headers, ficha_id, treino_id, item_id,
                                              exercicio_id, aluno_id):
    outra = client.post("/ficha", json={"aluno_id": aluno_id, "nome": "Outra"}, headers=professor_headers).json()["id"]
    outro_treino = client.post("/treino", json={"ficha_id": outra, "nome": "T", "ordem": 1},
                               headers=professor_headers).json()["id"]
    outro_item = client.post("/ficha/itens", json={
        "ficha_id": outra, "treino_id": outro_treino, "exercicio_id": exercicio_id, "series": 1, "repeticoes": 1,
        "carga": 0, "descanso": 1, "ordem": 1}, headers=professor_headers).json()["id"]

    r = client.put(f"/ficha/{ficha_id}/completa", headers=professor_headers,
                   json=_corpo([_treino([_item(exercicio_id, 1, id=outro_item)], id=treino_id)]))
    assert r.status_code == 404 and r.json()["detail"] == "Item da ficha não encontrado"

    r = client.put(f"/ficha/{ficha_id}/completa", headers=professor_headers,
                   json=_corpo([_treino([], id=outro_treino)]))
    assert r.status_code == 404 and r.json()["detail"] == "Treino não encontrado"

    # item da própria ficha, mas de outro treino: não migra de treino
    segundo = client.post("/treino", json={"ficha_id": ficha_id, "nome": "B", "ordem": 2},
                          headers=professor_headers).json()["id"]
    r = client.put(f"/ficha/{ficha_id}/completa", headers=professor_headers,
                   json=_corpo([_treino([], id=treino_id), _treino([_item(exercicio_id, 1, id=item_id)], ordem=2, id=segundo)]))
    assert r.status_code == 404

    # a outra ficha continua intacta
    assert len(_estado(client, professor_headers, outra)["treinos"][0]["itens"]) == 1


def test_ids_e_ordens_repetidos(client, professor_headers, ficha_id, treino_id, item_id, exercicio_id):
    r = client.put(f"/ficha/{ficha_id}/completa", headers=professor_headers,
                   json=_corpo([_treino([_item(exercicio_id, 1, id=item_id), _item(exercicio_id, 2, id=item_id)],
                                        id=treino_id)]))
    assert r.status_code == 422

    r = client.put(f"/ficha/{ficha_id}/completa", headers=professor_headers,
                   json=_corpo([_treino([_item(exercicio_id, 1), _item(exercicio_id, 1)], id=treino_id)]))
    assert r.status_code == 409
    assert r.json()["detail"] == "Já existe um exercício com esta ordem neste treino"

    r = client.put(f"/ficha/{ficha_id}/completa", headers=professor_headers,
                   json=_corpo([_treino([], id=treino_id), _treino([], ordem=1)]))
    assert r.status_code == 409
    assert r.json()["detail"] == "Já existe um treino com esta ordem nesta ficha"


def test_periodo_invalido_e_exercicio_inativo(client, professor_headers, ficha_id, treino_id, exercicio_id):
    r = client.put(f"/ficha/{ficha_id}/completa", headers=professor_headers,
                   json=_corpo([], data_inicio="2026-11-10", data_fim="2026-11-01"))
    assert r.status_code == 400
    assert r.json()["detail"] == "A data final deve ser posterior à data inicial"

    assert client.delete(f"/exercicios/{exercicio_id}", headers=professor_headers).status_code == 200
    r = client.put(f"/ficha/{ficha_id}/completa", headers=professor_headers,
                   json=_corpo([_treino([_item(exercicio_id, 1)], id=treino_id)]))
    assert r.status_code == 404 and r.json()["detail"] == "Exercicio não encontrado"


def test_item_removido_com_historico_continua_no_historico(
    client, db, professor_headers, aluno_headers, aluno_id, ficha_id, treino_id, item_id, exercicio_id
):
    outro = _exercicio(client, professor_headers, "Remada")
    sem_historico = client.post("/ficha/itens", json={
        "ficha_id": ficha_id, "treino_id": treino_id, "exercicio_id": outro, "series": 1, "repeticoes": 1,
        "carga": 0, "descanso": 1, "ordem": 2}, headers=professor_headers).json()["id"]
    sessao = client.post("/sessoes", json={"treino_id": treino_id}, headers=aluno_headers).json()
    r = client.post(f"/sessoes/{sessao['id']}/execucoes", headers=aluno_headers, json={"execucoes": [{
        "item_ficha_id": item_id, "series_realizadas": 1, "repeticoes_realizadas": 10, "carga_utilizada": 20}]})
    assert r.status_code == 200, r.text

    r = client.put(f"/ficha/{ficha_id}/completa", headers=professor_headers,
                   json=_corpo([_treino([], id=treino_id)]))

    assert r.status_code == 200 and r.json()["treinos"][0]["itens"] == []
    db.expire_all()
    com_historico = db.get(ItemFicha, item_id)
    assert com_historico is not None and com_historico.ativo is False
    assert db.query(HistoricoExecucao).filter(HistoricoExecucao.item_ficha_id == item_id).count() == 1
    assert db.get(ItemFicha, sem_historico) is None  # sem execução: apagado, como DELETE /ficha/item/{id}
    historico = client.get(f"/alunos/{aluno_id}/historico", headers=professor_headers).json()
    assert [h["item_ficha_id"] for h in historico] == [item_id]


def test_auditoria_unica_com_resumo(client, db, professor_headers, ficha_id, treino_id, item_id, exercicio_id):
    antes = db.query(Auditoria).count()
    r = client.put(f"/ficha/{ficha_id}/completa", headers=professor_headers, json=_corpo([
        _treino([_item(exercicio_id, 1, id=item_id, series=8), _item(exercicio_id, 2)], id=treino_id),
        _treino([_item(exercicio_id, 1)], ordem=2),
    ], nome="Nova"))
    assert r.status_code == 200, r.text

    db.expire_all()
    novas = db.query(Auditoria).order_by(Auditoria.id).all()[antes:]
    assert [a.acao for a in novas] == ["ficha.editar"]
    detalhes = novas[0].detalhes
    assert detalhes["ficha_id"] == ficha_id and detalhes["completa"] is True
    assert detalhes["campos_alterados"] == ["nome"]
    assert (detalhes["treinos_criados"], detalhes["itens_criados"], detalhes["itens_atualizados"]) == (1, 2, 1)
    assert detalhes["treinos_removidos"] == 0 and detalhes["itens_removidos"] == 0


def test_atualiza_atualizado_em(client, db, professor_headers, ficha_id, treino_id, exercicio_id):
    antes = _estado(client, professor_headers, ficha_id)["atualizado_em"]
    r = client.put(f"/ficha/{ficha_id}/completa", headers=professor_headers,
                   json=_corpo([_treino([_item(exercicio_id, 1)], id=treino_id)]))

    assert r.json()["atualizado_em"] >= antes


def test_rotas_atuais_continuam(client, professor_headers, ficha_id, treino_id, item_id):
    assert client.put(f"/ficha/{ficha_id}", json={"nome": "Velha"}, headers=professor_headers).status_code == 200
    assert client.put(f"/ficha/item/{item_id}", headers=professor_headers, json={
        "series": 4, "repeticoes": 8, "carga": 10.0, "descanso": 30, "ordem": 1}).status_code == 200
