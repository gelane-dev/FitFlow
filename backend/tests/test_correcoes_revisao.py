from datetime import datetime

import pytest
from sqlalchemy import event
from sqlalchemy.exc import IntegrityError

from app.models import Exercicio, HistoricoExecucao, ItemFicha, SessaoTreino
from sqlalchemy.orm import Session

from conftest import SessionTeste, engine_teste


# ---------- queries fixas (sem N+1) ----------

class _ContadorDeQueries:
    def __init__(self):
        self.total = 0

    def __call__(self, *args, **kwargs):
        self.total += 1


def _contar(client, url, headers):
    contador = _ContadorDeQueries()
    event.listen(engine_teste, "before_cursor_execute", contador)
    try:
        r = client.get(url, headers=headers)
    finally:
        event.remove(engine_teste, "before_cursor_execute", contador)
    assert r.status_code == 200
    return contador.total, r.json()


def _sessao_com_execucao(client, headers, treino_id, item_id):
    sessao = client.post("/sessoes", json={"treino_id": treino_id}, headers=headers).json()
    client.post(f"/sessoes/{sessao['id']}/execucoes",
                json={"execucoes": [{"item_ficha_id": item_id, "series_realizadas": 1,
                                     "repeticoes_realizadas": 10, "carga_utilizada": 20}]},
                headers=headers)
    client.post(f"/sessoes/{sessao['id']}/finalizar", json={}, headers=headers)
    return sessao["id"]


def test_get_sessoes_tem_numero_fixo_de_queries(client, aluno_headers, treino_id, item_id):
    _sessao_com_execucao(client, aluno_headers, treino_id, item_id)
    com_1, corpo = _contar(client, "/sessoes", aluno_headers)
    assert len(corpo) == 1

    for _ in range(4):
        _sessao_com_execucao(client, aluno_headers, treino_id, item_id)
    com_5, corpo = _contar(client, "/sessoes", aluno_headers)

    assert len(corpo) == 5 and all(s["total_execucoes"] == 1 for s in corpo)
    assert com_5 == com_1
    assert com_5 <= 5


def test_get_ficha_progresso_tem_numero_fixo_de_queries(client, aluno_headers, treino_id, item_id):
    _sessao_com_execucao(client, aluno_headers, treino_id, item_id)
    com_1, _ = _contar(client, "/ficha/progresso", aluno_headers)

    for _ in range(4):
        _sessao_com_execucao(client, aluno_headers, treino_id, item_id)
    com_5, corpo = _contar(client, "/ficha/progresso", aluno_headers)

    assert len(corpo) == 5 and corpo[0]["exercicio_nome"] == "Supino"
    assert com_5 == com_1
    assert com_5 <= 5


def test_historico_do_aluno_e_detalhe_da_sessao_tem_numero_fixo_de_queries(client, professor_headers, aluno_headers,
                                                                          aluno_id, treino_id, item_id):
    ultima = _sessao_com_execucao(client, aluno_headers, treino_id, item_id)
    h1, _ = _contar(client, f"/alunos/{aluno_id}/historico", professor_headers)
    s1, _ = _contar(client, f"/sessoes/{ultima}", professor_headers)
    l1, _ = _contar(client, f"/alunos/{aluno_id}/sessoes", professor_headers)

    for _ in range(4):
        ultima = _sessao_com_execucao(client, aluno_headers, treino_id, item_id)
    h5, corpo = _contar(client, f"/alunos/{aluno_id}/historico", professor_headers)
    s5, _ = _contar(client, f"/sessoes/{ultima}", professor_headers)
    l5, _ = _contar(client, f"/alunos/{aluno_id}/sessoes", professor_headers)

    assert len(corpo) == 5
    assert (h5, s5, l5) == (h1, s1, l1)


def test_listas_de_fichas_tem_numero_fixo_de_queries(client, professor_headers, aluno_headers, aluno_id):
    def criar():
        client.post("/ficha", json={"aluno_id": aluno_id, "nome": "F"}, headers=professor_headers)

    criar()
    p1, _ = _contar(client, "/ficha", professor_headers)
    a1, _ = _contar(client, "/ficha/aluno", aluno_headers)
    for _ in range(4):
        criar()
    p5, corpo_p = _contar(client, "/ficha", professor_headers)
    a5, corpo_a = _contar(client, "/ficha/aluno", aluno_headers)

    assert len(corpo_p) == 5 and len(corpo_a) == 5
    assert (p5, a5) == (p1, a1)


# ---------- reordenação atômica (ADR-028) ----------

@pytest.fixture
def tres_itens(client, professor_headers, ficha_id, treino_id):
    ids = []
    for i in range(3):
        exercicio = client.post("/exercicios", json={"nome": f"Ex {i}", "descricao": "d", "grupo_muscular": "g"},
                                headers=professor_headers).json()["id"]
        r = client.post("/ficha/itens", json={"ficha_id": ficha_id, "treino_id": treino_id, "exercicio_id": exercicio,
                                              "series": 3, "repeticoes": 10, "carga": 5, "descanso": 30, "ordem": i + 1},
                        headers=professor_headers)
        ids.append(r.json()["id"])
    return ids


def _ordens(db):
    db.expire_all()
    return {i.id: i.ordem for i in db.query(ItemFicha).all()}


def test_reordenar_itens(client, db, professor_headers, treino_id, tres_itens):
    a, b, c = tres_itens
    r = client.put(f"/treino/{treino_id}/itens/ordem",
                   json={"itens": [{"id": a, "ordem": 3}, {"id": b, "ordem": 1}, {"id": c, "ordem": 2}]},
                   headers=professor_headers)
    assert r.status_code == 200
    assert [i["id"] for i in r.json()] == [b, c, a]
    assert r.json()[0]["nome"].startswith("Ex")
    assert _ordens(db) == {a: 3, b: 1, c: 2}


def test_reordenar_so_parte_dos_itens_respeitando_os_demais(client, db, professor_headers, treino_id, tres_itens):
    a, b, c = tres_itens
    ok = client.put(f"/treino/{treino_id}/itens/ordem", json={"itens": [{"id": a, "ordem": 10}]}, headers=professor_headers)
    assert ok.status_code == 200
    assert _ordens(db) == {a: 10, b: 2, c: 3}

    # conflito com item ativo não enviado (c = 3)
    r = client.put(f"/treino/{treino_id}/itens/ordem", json={"itens": [{"id": a, "ordem": 3}]}, headers=professor_headers)
    assert r.status_code == 400
    assert r.json()["detail"] == "Ordens duplicadas"
    assert _ordens(db) == {a: 10, b: 2, c: 3}


def test_reordenar_ordens_duplicadas_400_sem_alterar_nada(client, db, professor_headers, treino_id, tres_itens):
    a, b, c = tres_itens
    r = client.put(f"/treino/{treino_id}/itens/ordem",
                   json={"itens": [{"id": a, "ordem": 5}, {"id": b, "ordem": 5}]}, headers=professor_headers)
    assert r.status_code == 400
    assert r.json()["detail"] == "Ordens duplicadas"
    assert _ordens(db) == {a: 1, b: 2, c: 3}


def test_reordenar_item_repetido_400(client, db, professor_headers, treino_id, tres_itens):
    a, b, c = tres_itens
    r = client.put(f"/treino/{treino_id}/itens/ordem",
                   json={"itens": [{"id": a, "ordem": 7}, {"id": a, "ordem": 8}]}, headers=professor_headers)
    assert r.status_code == 400
    assert _ordens(db) == {a: 1, b: 2, c: 3}


def test_reordenar_item_de_outro_treino_404_e_atomico(client, db, professor_headers, ficha_id, treino_id, tres_itens,
                                                      exercicio_id):
    a, b, c = tres_itens
    outro_treino = client.post("/treino", json={"ficha_id": ficha_id, "nome": "B", "dia_semana": "terça", "ordem": 2},
                               headers=professor_headers).json()["id"]
    item_b = client.post("/ficha/itens", json={"ficha_id": ficha_id, "treino_id": outro_treino, "exercicio_id": exercicio_id,
                                               "series": 3, "repeticoes": 10, "carga": 5, "descanso": 30, "ordem": 1},
                         headers=professor_headers).json()["id"]
    r = client.put(f"/treino/{treino_id}/itens/ordem",
                   json={"itens": [{"id": a, "ordem": 9}, {"id": item_b, "ordem": 8}]}, headers=professor_headers)
    assert r.status_code == 404
    assert r.json()["detail"] == "Item da ficha não encontrado"
    assert _ordens(db) == {a: 1, b: 2, c: 3, item_b: 1}

    assert client.put(f"/treino/{treino_id}/itens/ordem", json={"itens": [{"id": 9999, "ordem": 1}]},
                      headers=professor_headers).status_code == 404


def test_reordenar_item_inativo_404(client, db, professor_headers, treino_id, tres_itens):
    a = tres_itens[0]
    db.get(ItemFicha, a).ativo = False
    db.commit()
    r = client.put(f"/treino/{treino_id}/itens/ordem", json={"itens": [{"id": a, "ordem": 9}]}, headers=professor_headers)
    assert r.status_code == 404


def test_reordenar_permissoes_e_validacoes(client, db, professor_headers, outro_professor_headers, aluno_headers,
                                           treino_id, tres_itens):
    a, b, c = tres_itens
    corpo = {"itens": [{"id": a, "ordem": 9}]}
    url = f"/treino/{treino_id}/itens/ordem"
    assert client.put(url, json=corpo, headers=outro_professor_headers).status_code == 403
    assert client.put(url, json=corpo, headers=aluno_headers).status_code == 403
    assert client.put("/treino/999/itens/ordem", json=corpo, headers=professor_headers).status_code == 404
    assert client.put(url, json={"itens": []}, headers=professor_headers).status_code == 422
    assert client.put(url, json={"itens": [{"id": a, "ordem": 0}]}, headers=professor_headers).status_code == 422
    assert _ordens(db) == {a: 1, b: 2, c: 3}


# ---------- idempotência garantida pelo banco (ADR-029) ----------

def test_indice_unico_impede_duas_sessoes_abertas(db, aluno_id, treino_id):
    agora = datetime(2026, 1, 1, 10)
    db.add(SessaoTreino(aluno_id=aluno_id, treino_id=treino_id, iniciada_em=agora))
    db.commit()
    db.add(SessaoTreino(aluno_id=aluno_id, treino_id=treino_id, iniciada_em=agora))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

    # finalizada não conta: pode haver várias
    db.add(SessaoTreino(aluno_id=aluno_id, treino_id=treino_id, iniciada_em=agora, finalizada_em=agora))
    db.add(SessaoTreino(aluno_id=aluno_id, treino_id=treino_id, iniciada_em=agora, finalizada_em=agora))
    db.commit()


def test_iniciar_sessao_concorrente_devolve_a_existente(client, db, monkeypatch, aluno_headers, aluno_id, treino_id):
    """Corrida: a outra requisição grava a sessão aberta logo antes do commit desta."""
    outro_db = SessionTeste()
    concorrente = {}
    commit_original = Session.commit
    inseriu = {"feito": False}

    def commit_com_corrida(self):
        # Só na primeira vez e só na sessão do pedido (a que tem a nova sessão pendente)
        if not inseriu["feito"] and any(isinstance(o, SessaoTreino) for o in self.new):
            inseriu["feito"] = True
            rival = SessaoTreino(aluno_id=aluno_id, treino_id=treino_id, iniciada_em=datetime(2026, 1, 1, 10))
            outro_db.add(rival)
            outro_db.commit()
            concorrente["id"] = rival.id
        return commit_original(self)

    monkeypatch.setattr(Session, "commit", commit_com_corrida)

    r = client.post("/sessoes", json={"treino_id": treino_id}, headers=aluno_headers)
    outro_db.close()

    assert inseriu["feito"]
    assert r.status_code == 200
    assert r.json()["id"] == concorrente["id"]
    assert r.json()["finalizada_em"] is None
    assert db.query(SessaoTreino).count() == 1


# ---------- fuso: grava naive em APP_TIMEZONE ----------

def _execucao_legada(item_id, quando):
    return {"item_ficha_id": item_id, "data_execucao": quando, "series_realizadas": 1,
            "repeticoes_realizadas": 10, "carga_utilizada": 20, "observacao": None}


def test_execucao_legada_com_fuso_e_convertida_para_horario_local(client, db, aluno_headers, item_id):
    # 23:30 e 00:10 locais (UTC-3), enviados com fuso explícito e em UTC
    for quando in ("2026-01-10T23:30:00-03:00", "2026-01-11T03:10:00Z"):
        assert client.post("/ficha/treino", json=_execucao_legada(item_id, quando), headers=aluno_headers).status_code == 200

    datas = sorted(h.data_execucao for h in db.query(HistoricoExecucao).all())
    assert datas == [datetime(2026, 1, 10, 23, 30), datetime(2026, 1, 11, 0, 10)]


def test_execucao_legada_sem_fuso_e_mantida(client, db, aluno_headers, item_id):
    client.post("/ficha/treino", json=_execucao_legada(item_id, "2026-01-10T23:30:00"), headers=aluno_headers)
    assert db.query(HistoricoExecucao).one().data_execucao == datetime(2026, 1, 10, 23, 30)


def test_evolucao_separa_23h30_e_00h10_em_dias_diferentes(client, aluno_headers, exercicio_id, item_id):
    for quando in ("2026-01-11T02:30:00Z", "2026-01-11T03:10:00Z"):  # 23:30 do dia 10 e 00:10 do dia 11, em UTC-3
        client.post("/ficha/treino", json=_execucao_legada(item_id, quando), headers=aluno_headers)
    pontos = client.get(f"/evolucao/exercicios/{exercicio_id}", headers=aluno_headers).json()["pontos"]
    assert [p["data"] for p in pontos] == ["2026-01-10", "2026-01-11"]


def test_data_avaliacao_com_fuso_e_convertida(client, db, professor_headers, aluno_headers, aluno_id):
    corpo = {"peso": 70, "altura": 1.75}
    r1 = client.post(f"/alunos/{aluno_id}/avaliacoes", json={**corpo, "data_avaliacao": "2026-01-11T02:30:00Z"},
                     headers=professor_headers)
    r2 = client.post(f"/alunos/{aluno_id}/avaliacoes", json={**corpo, "data_avaliacao": "2026-01-11T00:10:00-03:00"},
                     headers=professor_headers)
    assert r1.json()["data_avaliacao"] == "2026-01-10T23:30:00-03:00"
    assert r2.json()["data_avaliacao"] == "2026-01-11T00:10:00-03:00"

    r3 = client.put(f"/avaliacoes/{r1.json()['id']}", json={**corpo, "data_avaliacao": "2026-01-11T03:10:00Z"},
                    headers=professor_headers)
    assert r3.json()["data_avaliacao"] == "2026-01-11T00:10:00-03:00"


# ---------- N+1 residual e filtro de exercício inativo ----------

def _treino_com_itens(client, professor_headers, ficha_id, quantidade, dia, ordem_treino):
    treino = client.post("/treino", json={"ficha_id": ficha_id, "nome": f"T{ordem_treino}", "dia_semana": dia,
                                          "ordem": ordem_treino}, headers=professor_headers).json()["id"]
    for i in range(quantidade):
        exercicio = client.post("/exercicios", json={"nome": f"E{ordem_treino}{i}", "descricao": "d", "grupo_muscular": "g"},
                                headers=professor_headers).json()["id"]
        client.post("/ficha/itens", json={"ficha_id": ficha_id, "treino_id": treino, "exercicio_id": exercicio,
                                          "series": 3, "repeticoes": 10, "carga": 5, "descanso": 30, "ordem": i + 1},
                    headers=professor_headers)
    return treino


def test_get_ficha_e_treino_hoje_tem_numero_fixo_de_queries(client, professor_headers, aluno_headers, ficha_id):
    from conftest import dia_hoje
    _treino_com_itens(client, professor_headers, ficha_id, 1, dia_hoje(), 1)
    f1, _ = _contar(client, f"/ficha/{ficha_id}", aluno_headers)
    h1, _ = _contar(client, f"/treino/hoje/{ficha_id}", aluno_headers)

    _treino_com_itens(client, professor_headers, ficha_id, 5, dia_hoje(), 2)
    f5, ficha = _contar(client, f"/ficha/{ficha_id}", aluno_headers)
    h5, hoje = _contar(client, f"/treino/hoje/{ficha_id}", aluno_headers)

    assert sum(len(t["itens"]) for t in ficha["treinos"]) == 6
    assert sum(len(t["itens"]) for t in hoje) == 6
    assert (f5, h5) == (f1, h1)
    assert f5 <= 5 and h5 <= 5


def test_reordenar_resposta_exclui_item_de_exercicio_inativo(client, db, professor_headers, treino_id, tres_itens):
    a, b, c = tres_itens
    exercicio_do_c = db.get(ItemFicha, c).exercicio_id
    db.get(Exercicio, exercicio_do_c).ativo = False
    db.commit()

    r = client.put(f"/treino/{treino_id}/itens/ordem", json={"itens": [{"id": a, "ordem": 2}, {"id": b, "ordem": 1}]},
                   headers=professor_headers)
    assert r.status_code == 200
    assert [i["id"] for i in r.json()] == [b, a]

    listagem = client.get(f"/ficha/itens/treino/{treino_id}", headers=professor_headers).json()
    assert [i["id"] for i in listagem] == [i["id"] for i in r.json()]
