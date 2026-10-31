from datetime import timedelta

from app.core.tempo import agora
from conftest import dia_hoje


def test_fluxo_completo_professor_aluno(client, professor_headers, aluno_headers, aluno_id, exercicio_id):
    hoje = agora().date()

    # professor cria ficha com vigência, treino e item
    ficha = client.post("/ficha", json={"aluno_id": aluno_id, "nome": "Hipertrofia",
                                        "data_inicio": hoje.isoformat(),
                                        "data_fim": (hoje + timedelta(days=30)).isoformat()},
                        headers=professor_headers).json()
    assert ficha["vigente"] is True
    treino = client.post("/treino", json={"ficha_id": ficha["id"], "nome": "A", "dia_semana": dia_hoje(), "ordem": 1},
                         headers=professor_headers).json()
    item = client.post("/ficha/itens", json={"ficha_id": ficha["id"], "treino_id": treino["id"],
                                             "exercicio_id": exercicio_id, "series": 3, "repeticoes": 10,
                                             "carga": 20, "descanso": 60, "ordem": 1},
                       headers=professor_headers).json()

    # aluno vê a ficha vigente e o treino do dia
    fichas = client.get("/ficha/aluno", headers=aluno_headers).json()
    assert [f["id"] for f in fichas] == [ficha["id"]] and fichas[0]["vigente"] is True
    hoje_treinos = client.get(f"/treino/hoje/{ficha['id']}", headers=aluno_headers).json()
    assert [t["id"] for t in hoje_treinos] == [treino["id"]]

    # aluno inicia sessão, registra 3 séries e finaliza com esforço
    sessao = client.post("/sessoes", json={"treino_id": treino["id"]}, headers=aluno_headers).json()
    for carga in (20, 22.5, 25):
        r = client.post(f"/sessoes/{sessao['id']}/execucoes",
                        json={"execucoes": [{"item_ficha_id": item["id"], "series_realizadas": 1,
                                             "repeticoes_realizadas": 10, "carga_utilizada": carga}]},
                        headers=aluno_headers)
        assert r.status_code == 200
    final = client.post(f"/sessoes/{sessao['id']}/finalizar", json={"esforco": 8, "comentario": "Boa"},
                        headers=aluno_headers).json()
    assert final["total_execucoes"] == 3 and final["esforco"] == 8 and final["finalizada_em"]

    # professor vê histórico, sessões e evolução
    historico = client.get(f"/alunos/{aluno_id}/historico", headers=professor_headers).json()
    assert len(historico) == 3 and all(h["sessao_id"] == sessao["id"] for h in historico)
    sessoes = client.get(f"/alunos/{aluno_id}/sessoes", headers=professor_headers).json()
    assert [s["id"] for s in sessoes] == [sessao["id"]]
    detalhe = client.get(f"/sessoes/{sessao['id']}", headers=professor_headers).json()
    assert len(detalhe["execucoes"]) == 3
    evolucao = client.get(f"/alunos/{aluno_id}/evolucao/exercicios/{exercicio_id}", headers=professor_headers).json()
    assert len(evolucao["pontos"]) == 1
    ponto = evolucao["pontos"][0]
    assert (ponto["registros"], ponto["carga_maxima"], ponto["volume"]) == (3, 25.0, 10 * 20 + 10 * 22.5 + 10 * 25)

    # aluno vê a própria evolução
    resumo = client.get("/evolucao/exercicios", headers=aluno_headers).json()
    assert resumo[0]["total_registros"] == 3 and resumo[0]["ultima_carga"] == 25.0

    # professor cria avaliação; aluno lê
    av = client.post(f"/alunos/{aluno_id}/avaliacoes",
                     json={"data_avaliacao": "2026-03-01T08:00:00", "peso": 70, "altura": 1.75},
                     headers=professor_headers)
    assert av.status_code == 200
    minhas = client.get("/avaliacoes", headers=aluno_headers).json()
    assert [a["id"] for a in minhas] == [av.json()["id"]]
    assert minhas[0]["imc"] == 22.86
