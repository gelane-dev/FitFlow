from datetime import datetime

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.models import Aluno, Ficha, Professor, User
from tests.conftest import dia_hoje


def _login(client, email, senha):
    r = client.post("/login", json={"email": email, "senha": senha})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_fluxo_completo(client, db, admin_headers, ids_divergentes):
    # admin cria professor
    r = client.post(
        "/admin/professores",
        json={"email": "prof.fluxo@teste.com", "senha": "senha123", "nome": "Prof Fluxo", "telefone": "11911112222"},
        headers=admin_headers,
    )
    assert r.status_code == 200, r.text

    # aluno se cadastra e faz login
    r = client.post("/cadastro", json={
        "email": "aluno.fluxo@teste.com", "senha": "abc12345", "nome": "Aluno Fluxo",
        "telefone": "11988887777", "data_nascimento": "2001-02-03",
    })
    assert r.status_code == 200, r.text
    aluno_h = _login(client, "aluno.fluxo@teste.com", "abc12345")
    prof_h = _login(client, "prof.fluxo@teste.com", "senha123")

    aluno = db.query(Aluno).join(User, Aluno.user_id == User.id).filter(User.email == "aluno.fluxo@teste.com").one()
    assert aluno.id != aluno.user_id

    # professor cria exercício, ficha, treino (hoje) e item
    r = client.post("/exercicios", json={"nome": "Agachamento", "descricao": "Perna", "grupo_muscular": "perna"}, headers=prof_h)
    assert r.status_code == 200, r.text
    exercicio_id = r.json()["id"]

    r = client.post("/ficha", json={"aluno_id": aluno.id, "nome": "Ficha Fluxo"}, headers=prof_h)
    assert r.status_code == 200, r.text
    ficha_id = r.json()["id"]

    r = client.post("/treino", json={"ficha_id": ficha_id, "nome": "Treino Hoje", "dia_semana": dia_hoje(), "ordem": 1}, headers=prof_h)
    assert r.status_code == 200, r.text
    treino_id = r.json()["id"]

    r = client.post("/ficha/itens", json={
        "ficha_id": ficha_id, "treino_id": treino_id, "exercicio_id": exercicio_id,
        "series": 3, "repeticoes": 10, "carga": 20.0, "descanso": 60, "ordem": 1,
    }, headers=prof_h)
    assert r.status_code == 200, r.text
    item_id = r.json()["id"]

    # aluno lê ficha e treino do dia
    r = client.get(f"/ficha/{ficha_id}", headers=aluno_h)
    assert r.status_code == 200, r.text
    assert r.json()["id"] == ficha_id

    r = client.get(f"/treino/hoje/{ficha_id}", headers=aluno_h)
    assert r.status_code == 200, r.text
    assert [t["id"] for t in r.json()] == [treino_id]
    assert [i["id"] for i in r.json()[0]["itens"]] == [item_id]

    # aluno registra execução e lê progresso
    r = client.post("/ficha/treino", json={
        "item_ficha_id": item_id, "data_execucao": datetime.now().isoformat(),
        "series_realizadas": 3, "repeticoes_realizadas": 10, "carga_utilizada": 20.0, "observacao": None,
    }, headers=aluno_h)
    assert r.status_code == 200, r.text

    r = client.get("/ficha/progresso", headers=aluno_h)
    assert r.status_code == 200, r.text
    assert len(r.json()) == 1

    # professor exclui treino; aluno deixa de vê-lo
    r = client.delete(f"/treino/{treino_id}", headers=prof_h)
    assert r.status_code == 200, r.text

    r = client.get(f"/treino/hoje/{ficha_id}", headers=aluno_h)
    assert r.status_code == 200
    assert r.json() == []


def test_foreign_keys_ativas(db, aluno_id):
    if db.get_bind().dialect.name == "sqlite":
        assert db.execute(text("PRAGMA foreign_keys")).scalar() == 1
    db.add(Ficha(professor_id=9999, aluno_id=aluno_id, nome="Órfã"))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
