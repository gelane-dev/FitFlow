import os

# Variáveis de teste precisam existir antes de importar a aplicação
# TEST_POSTGRES_URL faz a suíte inteira rodar contra PostgreSQL (ADR-004/T-TEC-02);
# sem ela, usa SQLite em memória.
URL_POSTGRES = os.getenv("TEST_POSTGRES_URL")
if URL_POSTGRES:
    from banco_seguro import validar_url_banco_teste

    try:
        validar_url_banco_teste(URL_POSTGRES)
    except ValueError as erro:
        import pytest as _pytest

        _pytest.exit(str(erro), returncode=2)
os.environ["DATABASE_URL"] = URL_POSTGRES or "sqlite://"
os.environ["SECRET_KEY"] = "chave-de-teste"

from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.tempo import agora
from app.core.seguranca import criar_hash, criar_token
from app.database import get_db
from app.enums.dia_semana import DiaSemana
from app.main import app
from app.models import Base, User, Professor, Aluno

if URL_POSTGRES:
    engine_teste = create_engine(URL_POSTGRES)
else:
    engine_teste = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine_teste, "connect")
    def _ativar_foreign_keys(conexao, _):
        conexao.execute("PRAGMA foreign_keys=ON")


SessionTeste = sessionmaker(bind=engine_teste, autoflush=False, autocommit=False)


@pytest.fixture(scope="session")
def _schema_postgres():
    """Recria o schema uma vez por sessão; test_migracoes.py o deixa em estado arbitrário."""
    if not URL_POSTGRES:
        yield
        return
    Base.metadata.drop_all(engine_teste)
    Base.metadata.create_all(engine_teste)
    yield
    Base.metadata.drop_all(engine_teste)


def _limpar_postgres():
    tabelas = ", ".join(f'"{t.name}"' for t in Base.metadata.sorted_tables)
    with engine_teste.begin() as conexao:
        conexao.execute(text(f"TRUNCATE {tabelas} RESTART IDENTITY CASCADE"))


@pytest.fixture(autouse=True)
def banco(_schema_postgres):
    if URL_POSTGRES:
        # TRUNCATE antes de cada teste: mais rápido que drop/create e deixa o dado para inspeção
        _limpar_postgres()
        yield
        return
    Base.metadata.create_all(engine_teste)
    yield
    Base.metadata.drop_all(engine_teste)


@pytest.fixture
def db(banco):
    sessao = SessionTeste()
    try:
        yield sessao
    finally:
        sessao.close()


@pytest.fixture
def client(banco):
    def _get_db():
        sessao = SessionTeste()
        try:
            yield sessao
        finally:
            sessao.close()

    app.dependency_overrides[get_db] = _get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def cloudinary_falso(monkeypatch):
    """Substitui as chamadas ao Cloudinary usadas em routers/exercicios.py."""
    from app.routers import exercicios

    chamadas = {"deletar_imagem": [], "deletar_video": []}
    monkeypatch.setattr(exercicios, "upload_imagem", lambda arquivo: ("http://img.teste/a.png", "img_id"))
    monkeypatch.setattr(exercicios, "upload_video", lambda arquivo: ("http://vid.teste/a.mp4", "vid_id"))
    monkeypatch.setattr(exercicios, "deletar_imagem", lambda pid: chamadas["deletar_imagem"].append(pid))
    monkeypatch.setattr(exercicios, "deletar_video", lambda pid: chamadas["deletar_video"].append(pid))
    return chamadas


def _criar_usuario(db, email, tipo, nome):
    usuario = User(email=email, senha=criar_hash("senha123"), tipo=tipo)
    db.add(usuario)
    db.flush()
    if tipo == "professor":
        db.add(Professor(user_id=usuario.id, nome=nome, telefone="11999999999"))
    elif tipo == "aluno":
        db.add(Aluno(user_id=usuario.id, nome=nome, telefone="11999999999", data_nascimento=date(2000, 1, 1)))
    db.commit()
    return usuario


def _headers(usuario):
    return {"Authorization": f"Bearer {criar_token(usuario.id)}"}


@pytest.fixture
def admin_headers(db):
    return _headers(_criar_usuario(db, "admin@teste.com", "admin", "Admin"))


@pytest.fixture
def ids_divergentes(db):
    """Cria usuários extras para que User.id e o id do perfil (Professor/Aluno) sejam diferentes."""
    for i in range(3):
        _criar_usuario(db, f"extra{i}@teste.com", "admin", f"Extra {i}")


@pytest.fixture
def professor_headers(db, ids_divergentes):
    return _headers(_criar_usuario(db, "prof@teste.com", "professor", "Professor"))


@pytest.fixture
def outro_professor_headers(db, ids_divergentes):
    return _headers(_criar_usuario(db, "prof2@teste.com", "professor", "Professor 2"))


@pytest.fixture
def aluno_headers(db, ids_divergentes):
    return _headers(_criar_usuario(db, "aluno@teste.com", "aluno", "Aluno"))


@pytest.fixture
def outro_aluno_headers(db, ids_divergentes):
    return _headers(_criar_usuario(db, "aluno2@teste.com", "aluno", "Aluno 2"))


@pytest.fixture
def aluno_id(db, aluno_headers):
    return db.query(Aluno).filter(Aluno.nome == "Aluno").one().id


@pytest.fixture
def exercicio_id(client, professor_headers):
    r = client.post(
        "/exercicios",
        json={"nome": "Supino", "descricao": "Peito", "grupo_muscular": "peito"},
        headers=professor_headers,
    )
    return r.json()["id"]


@pytest.fixture
def ficha_id(client, professor_headers, aluno_id):
    r = client.post("/ficha", json={"aluno_id": aluno_id, "nome": "Ficha A"}, headers=professor_headers)
    return r.json()["id"]


def dia_hoje() -> str:
    # Mesmo cálculo de routers/treino.py
    return list(DiaSemana)[agora().weekday()].value


@pytest.fixture
def treino_id(client, professor_headers, ficha_id):
    r = client.post(
        "/treino",
        json={"ficha_id": ficha_id, "nome": "Treino A", "dia_semana": dia_hoje(), "ordem": 1},
        headers=professor_headers,
    )
    return r.json()["id"]


@pytest.fixture
def item_id(client, professor_headers, ficha_id, treino_id, exercicio_id):
    r = client.post(
        "/ficha/itens",
        json={"ficha_id": ficha_id, "treino_id": treino_id, "exercicio_id": exercicio_id,
              "series": 3, "repeticoes": 10, "carga": 20.0, "descanso": 60, "ordem": 1},
        headers=professor_headers,
    )
    return r.json()["id"]
