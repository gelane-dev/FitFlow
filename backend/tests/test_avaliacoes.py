import pytest

from app.models import AvaliacaoFisica


def _corpo(**extra):
    return {"data_avaliacao": "2026-03-01T08:00:00", "peso": 80.0, "altura": 1.8, **extra}


def _criar(client, headers, aluno_id, **extra):
    return client.post(f"/alunos/{aluno_id}/avaliacoes", json=_corpo(**extra), headers=headers)


def test_criar_avaliacao_minima_calcula_imc(client, professor_headers, aluno_id):
    r = _criar(client, professor_headers, aluno_id)
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["imc"] == 24.69  # 80 / 1.8²
    assert corpo["aluno_id"] == aluno_id
    assert corpo["professor_id"] is not None
    assert corpo["percentual_gordura"] is None
    assert corpo["massa_muscular"] is None
    assert corpo["observacao"] is None


def test_criar_avaliacao_completa(client, professor_headers, aluno_id):
    r = _criar(client, professor_headers, aluno_id, percentual_gordura=18.5, massa_muscular=35.2, observacao="Ok")
    assert r.status_code == 200
    assert (r.json()["percentual_gordura"], r.json()["massa_muscular"], r.json()["observacao"]) == (18.5, 35.2, "Ok")


def test_professor_id_e_o_do_perfil_nao_do_usuario(client, db, professor_headers, aluno_id):
    from app.models import Professor
    r = _criar(client, professor_headers, aluno_id)
    assert r.json()["professor_id"] == db.query(Professor).filter(Professor.nome == "Professor").one().id


@pytest.mark.parametrize("campo,valor", [
    ("peso", 0), ("peso", -5),
    ("altura", 0.49), ("altura", 2.51),
    ("percentual_gordura", -0.1), ("percentual_gordura", 100.1),
    ("massa_muscular", 0), ("massa_muscular", -1),
    ("observacao", "x" * 501),
])
def test_validacoes_de_faixa_422(client, professor_headers, aluno_id, campo, valor):
    assert _criar(client, professor_headers, aluno_id, **{campo: valor}).status_code == 422


@pytest.mark.parametrize("campo,valor", [("altura", 0.5), ("altura", 2.5), ("percentual_gordura", 0), ("percentual_gordura", 100)])
def test_limites_aceitos(client, professor_headers, aluno_id, campo, valor):
    assert _criar(client, professor_headers, aluno_id, **{campo: valor}).status_code == 200


def test_campos_obrigatorios_422(client, professor_headers, aluno_id):
    assert client.post(f"/alunos/{aluno_id}/avaliacoes", json={"peso": 80}, headers=professor_headers).status_code == 422


def test_criar_avaliacao_permissoes_e_404(client, aluno_headers, professor_headers, aluno_id):
    assert _criar(client, aluno_headers, aluno_id).status_code == 403
    assert _criar(client, professor_headers, 999).status_code == 404


def test_listar_avaliacoes_do_aluno_desc(client, professor_headers, outro_professor_headers, aluno_headers, aluno_id):
    _criar(client, professor_headers, aluno_id, data_avaliacao="2026-01-01T08:00:00")
    _criar(client, outro_professor_headers, aluno_id, data_avaliacao="2026-05-01T08:00:00")
    _criar(client, professor_headers, aluno_id, data_avaliacao="2026-03-01T08:00:00")

    for headers in (professor_headers, outro_professor_headers):  # ADR-022
        r = client.get(f"/alunos/{aluno_id}/avaliacoes", headers=headers)
        assert r.status_code == 200
        assert [a["data_avaliacao"][:7] for a in r.json()] == ["2026-05", "2026-03", "2026-01"]

    assert client.get(f"/alunos/{aluno_id}/avaliacoes", headers=aluno_headers).status_code == 403
    assert client.get("/alunos/999/avaliacoes", headers=professor_headers).status_code == 404


def test_aluno_le_so_as_proprias(client, professor_headers, aluno_headers, outro_aluno_headers, aluno_id):
    _criar(client, professor_headers, aluno_id, data_avaliacao="2026-01-01T08:00:00")
    _criar(client, professor_headers, aluno_id, data_avaliacao="2026-02-01T08:00:00")

    r = client.get("/avaliacoes", headers=aluno_headers)
    assert r.status_code == 200
    assert [a["data_avaliacao"][:7] for a in r.json()] == ["2026-02", "2026-01"]
    assert r.json()[0]["imc"] == 24.69
    assert client.get("/avaliacoes", headers=outro_aluno_headers).json() == []
    assert client.get("/avaliacoes", headers=professor_headers).status_code == 403


def test_atualizar_avaliacao(client, professor_headers, aluno_headers, aluno_id):
    id_ = _criar(client, professor_headers, aluno_id, percentual_gordura=20).json()["id"]
    r = client.put(f"/avaliacoes/{id_}", json=_corpo(peso=90.0, altura=1.9), headers=professor_headers)
    assert r.status_code == 200
    assert r.json()["peso"] == 90.0
    assert r.json()["imc"] == 24.93
    assert r.json()["percentual_gordura"] is None  # PUT substitui o corpo inteiro
    assert client.get("/avaliacoes", headers=aluno_headers).json()[0]["peso"] == 90.0


def test_atualizar_avaliacao_erros(client, professor_headers, outro_professor_headers, aluno_headers, aluno_id):
    id_ = _criar(client, professor_headers, aluno_id).json()["id"]
    r = client.put(f"/avaliacoes/{id_}", json=_corpo(), headers=outro_professor_headers)
    assert r.status_code == 403
    assert r.json()["detail"] == "Você não tem permissão para alterar esta avaliação"
    assert client.put(f"/avaliacoes/{id_}", json=_corpo(), headers=aluno_headers).status_code == 403
    assert client.put("/avaliacoes/999", json=_corpo(), headers=professor_headers).status_code == 404
    assert client.put(f"/avaliacoes/{id_}", json=_corpo(altura=3), headers=professor_headers).status_code == 422


def test_excluir_avaliacao_e_fisica(client, db, professor_headers, aluno_id):
    id_ = _criar(client, professor_headers, aluno_id).json()["id"]
    assert client.delete(f"/avaliacoes/{id_}", headers=professor_headers).status_code == 200
    assert db.get(AvaliacaoFisica, id_) is None
    assert client.delete(f"/avaliacoes/{id_}", headers=professor_headers).status_code == 404


def test_excluir_avaliacao_erros(client, professor_headers, outro_professor_headers, aluno_headers, aluno_id):
    id_ = _criar(client, professor_headers, aluno_id).json()["id"]
    r = client.delete(f"/avaliacoes/{id_}", headers=outro_professor_headers)
    assert r.status_code == 403
    assert r.json()["detail"] == "Você não tem permissão para excluir esta avaliação"
    assert client.delete(f"/avaliacoes/{id_}", headers=aluno_headers).status_code == 403


def test_avaliacao_legada_sem_professor_nao_pode_ser_alterada(client, db, professor_headers, aluno_id):
    from datetime import datetime
    legada = AvaliacaoFisica(aluno_id=aluno_id, data_avaliacao=datetime(2025, 1, 1), peso=70, altura=1.7)
    db.add(legada)
    db.commit()
    assert client.put(f"/avaliacoes/{legada.id}", json=_corpo(), headers=professor_headers).status_code == 403
    assert client.delete(f"/avaliacoes/{legada.id}", headers=professor_headers).status_code == 403
