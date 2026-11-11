from datetime import timedelta

import pytest
from sqlalchemy import func, select

from app.models import AvaliacaoFisica, Exercicio, Ficha, SessaoTreino, User
from app.core.tempo import agora
from app.enums.dia_semana import DiaSemana
from app.routers import treino as treino_router
from app.scripts import criar_demo as criar_demo_modulo
from app.scripts.criar_demo import EMAIL_ALUNO, EMAIL_PROFESSOR, SENHA_DEMO, TREINOS, criar_demo


def test_criar_demo_cria_dados_e_e_idempotente(db, client):
    primeiro = criar_demo(db)
    assert primeiro == {"ficha_criada": 1, "sessoes": 8, "avaliacoes": 2}

    segundo = criar_demo(db)
    assert segundo == {"ficha_criada": 0, "sessoes": 0, "avaliacoes": 0}

    assert db.scalar(select(func.count(User.id)).where(User.email.in_([EMAIL_PROFESSOR, EMAIL_ALUNO]))) == 2
    assert db.scalar(select(func.count(Exercicio.id))) >= 6
    assert db.scalar(select(func.count(Ficha.id))) == 1
    assert db.scalar(select(func.count(SessaoTreino.id))) == 8
    assert db.scalar(select(func.count(AvaliacaoFisica.id))) == 2


@pytest.mark.parametrize("deslocamento", range(7))
def test_demo_aluno_tem_ficha_vigente_e_treino_de_hoje(db, client, monkeypatch, deslocamento):
    # Causa da falha antiga: o script põe o treino "livre" no dia de hoje (ou no sábado, se hoje já tem
    # treino fixo), então a quantidade de itens de "hoje" varia com o dia da semana (2 a 5). O teste
    # agora percorre os 7 dias da semana e calcula o esperado a partir dos dados do próprio script.
    dia_simulado = agora() + timedelta(days=deslocamento)  # perto de hoje: a ficha continua vigente
    monkeypatch.setattr(criar_demo_modulo, "agora", lambda: dia_simulado)
    monkeypatch.setattr(treino_router, "agora", lambda: dia_simulado)

    criar_demo(db)

    login = client.post("/login", json={"email": EMAIL_ALUNO, "senha": SENHA_DEMO})
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    fichas = client.get("/ficha/aluno", headers=headers)
    assert fichas.status_code == 200
    vigentes = [f for f in fichas.json() if f["vigente"]]
    assert len(vigentes) == 1

    dia_hoje = list(DiaSemana)[dia_simulado.weekday()]
    dias_fixos = {dia for _, dia, _ in TREINOS if dia is not None}
    esperado = [
        (nome, len(itens)) for nome, dia, itens in TREINOS
        if (dia or (dia_hoje if dia_hoje not in dias_fixos else DiaSemana.sabado)) == dia_hoje
    ]
    assert len(esperado) == 1  # todo dia da semana tem exatamente um treino

    hoje = client.get(f"/treino/hoje/{vigentes[0]['id']}", headers=headers)
    assert hoje.status_code == 200
    assert [(t["nome"], len(t["itens"])) for t in hoje.json()] == esperado
