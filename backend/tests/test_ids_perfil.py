"""Cobertura com User.id diferente do id de perfil (fixture ids_divergentes)."""
from datetime import date

from conftest import dia_hoje
from test_fichas import _execucao, _item


def test_ids_divergentes_de_verdade(db, professor_headers, aluno_headers):
    from app.models import Professor, Aluno
    prof = db.query(Professor).one()
    aluno = db.query(Aluno).one()
    assert prof.user_id != prof.id
    assert aluno.user_id != aluno.id


def test_criar_ficha_grava_id_do_professor(db, client, professor_headers, aluno_id):
    from app.models import Professor, Ficha
    r = client.post("/ficha", json={"aluno_id": aluno_id, "nome": "F"}, headers=professor_headers)
    assert r.status_code == 200
    ficha = db.get(Ficha, r.json()["id"])
    assert ficha.professor_id == db.query(Professor).one().id
    assert ficha.aluno_id == aluno_id


def test_professor_lista_suas_fichas(client, professor_headers, outro_professor_headers, ficha_id):
    assert [f["id"] for f in client.get("/ficha", headers=professor_headers).json()] == [ficha_id]
    assert client.get("/ficha", headers=outro_professor_headers).json() == []


def test_historico_grava_id_do_aluno(db, client, aluno_headers, item_id):
    from app.models import Aluno, HistoricoExecucao
    assert client.post("/ficha/treino", json=_execucao(item_id), headers=aluno_headers).status_code == 200
    assert db.query(HistoricoExecucao).one().aluno_id == db.query(Aluno).one().id
    assert len(client.get("/ficha/progresso", headers=aluno_headers).json()) == 1


def test_treino_de_hoje_e_ficha_do_aluno_com_ids_divergentes(client, aluno_headers, ficha_id, treino_id, item_id):
    assert client.get(f"/treino/hoje/{ficha_id}", headers=aluno_headers).status_code == 200
    assert client.get(f"/ficha/{ficha_id}", headers=aluno_headers).status_code == 200
    assert client.get("/ficha/aluno", headers=aluno_headers).status_code == 200


def test_treino_de_hoje_respeita_ordem(client, professor_headers, aluno_headers, ficha_id):
    # ids crescentes, ordem decrescente
    for nome, ordem in (("Segundo", 2), ("Primeiro", 1)):
        r = client.post("/treino", json={"ficha_id": ficha_id, "nome": nome, "dia_semana": dia_hoje(), "ordem": ordem}, headers=professor_headers)
        assert r.status_code == 200
    r = client.get(f"/treino/hoje/{ficha_id}", headers=aluno_headers)
    assert [t["nome"] for t in r.json()] == ["Primeiro", "Segundo"]


def _novo_exercicio(client, headers, nome):
    return client.post("/exercicios", json={"nome": nome, "descricao": "d", "grupo_muscular": "g"}, headers=headers).json()["id"]


def test_ficha_do_aluno_exclui_inativos_e_ordena(client, db, professor_headers, aluno_headers, ficha_id, exercicio_id):
    from app.models import Treino, ItemFicha

    def novo_treino(nome, ordem):
        r = client.post("/treino", json={"ficha_id": ficha_id, "nome": nome, "dia_semana": "segunda", "ordem": ordem}, headers=professor_headers)
        return r.json()["id"]

    def novo_item(treino, ex, ordem):
        r = client.post("/ficha/itens", json=_item(ficha_id, treino, ex, ordem), headers=professor_headers)
        assert r.status_code == 200
        return r.json()["id"]

    t3 = novo_treino("T3", 3)
    t1 = novo_treino("T1", 1)
    t_inativo = novo_treino("Inativo", 2)
    i_b = novo_item(t1, exercicio_id, 2)
    i_a = novo_item(t1, _novo_exercicio(client, professor_headers, "Remada"), 1)
    i_inativo = novo_item(t1, _novo_exercicio(client, professor_headers, "X"), 3)
    novo_item(t_inativo, exercicio_id, 1)
    db.get(Treino, t_inativo).ativo = False
    db.get(ItemFicha, i_inativo).ativo = False
    db.commit()

    corpo = client.get(f"/ficha/{ficha_id}", headers=aluno_headers).json()
    assert [t["nome"] for t in corpo["treinos"]] == ["T1", "T3"]
    assert [i["id"] for i in corpo["treinos"][0]["itens"]] == [i_a, i_b]
    assert corpo["treinos"][1]["itens"] == []


def test_ficha_de_outro_aluno_da_404(client, db, aluno_headers, ficha_id):
    from app.core.seguranca import criar_hash, criar_token
    from app.models import User, Aluno
    u = User(email="outro@aluno.com", senha=criar_hash("x"), tipo="aluno")
    db.add(u)
    db.flush()
    db.add(Aluno(user_id=u.id, nome="Outro", telefone="1", data_nascimento=date(2000, 1, 1)))
    db.commit()
    h = {"Authorization": f"Bearer {criar_token(u.id)}"}
    r = client.get(f"/ficha/{ficha_id}", headers=h)
    assert r.status_code == 404
    assert r.json()["detail"] == "Ficha não encontrada"
