from sqlalchemy import func, select

from app.models import AvaliacaoFisica, Exercicio, Ficha, SessaoTreino, User
from app.scripts.criar_demo import EMAIL_ALUNO, EMAIL_PROFESSOR, SENHA_DEMO, criar_demo


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


def test_demo_aluno_tem_ficha_vigente_e_treino_de_hoje(db, client):
    criar_demo(db)

    login = client.post("/login", json={"email": EMAIL_ALUNO, "senha": SENHA_DEMO})
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    fichas = client.get("/ficha/aluno", headers=headers)
    assert fichas.status_code == 200
    vigentes = [f for f in fichas.json() if f["vigente"]]
    assert len(vigentes) == 1

    hoje = client.get(f"/treino/hoje/{vigentes[0]['id']}", headers=headers)
    assert hoje.status_code == 200
    assert len(hoje.json()) >= 1
    assert 4 <= len(hoje.json()[0]["itens"]) <= 6
