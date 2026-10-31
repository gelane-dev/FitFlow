import importlib
import io
from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from app.core import config, seguranca
from app.main import configurar_cors
from app.models import User
from app.routers import usuarios
from app.scripts import criar_admin as script_admin


# B1
def test_perfil_tem_tipo_e_foto(client, professor_headers):
    r = client.get("/perfil", headers=professor_headers)
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["tipo"] == "professor"
    assert corpo["foto"] is None
    assert set(corpo) == {"id", "email", "tipo", "foto"}


def test_cadastro_retorna_tipo_e_foto(client):
    r = client.post("/cadastro", json={
        "email": "n@teste.com", "senha": "abc12345", "nome": "N",
        "telefone": "11988887777", "data_nascimento": "2001-02-03",
    })
    assert r.status_code == 200
    assert r.json()["tipo"] == "aluno"
    assert r.json()["foto"] is None


# B2
def test_criar_token_usa_jwt_expira_minutos(monkeypatch):
    monkeypatch.setattr(seguranca, "JWT_EXPIRA_MINUTOS", 5)
    payload = jwt.decode(seguranca.criar_token(1), seguranca.SECRET_KEY, algorithms=["HS256"])
    restante = payload["exp"] - datetime.now(timezone.utc).timestamp()
    assert 200 < restante <= 300


def test_token_expirado_retorna_401(client):
    token = jwt.encode(
        {"sub": "1", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        seguranca.SECRET_KEY, algorithm="HS256",
    )
    r = client.get("/perfil", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


def test_jwt_expira_minutos_padrao(monkeypatch):
    # Isola do backend/.env local: sem a variável, o padrão é 30 minutos
    monkeypatch.delenv("JWT_EXPIRA_MINUTOS", raising=False)
    monkeypatch.setattr("dotenv.load_dotenv", lambda *a, **k: False)
    try:
        recarregada = importlib.reload(config)
        assert recarregada.JWT_EXPIRA_MINUTOS == 30
    finally:
        monkeypatch.undo()
        importlib.reload(config)


# B3
def test_cors_vazio_ou_curinga():
    esperado = {"allow_origins": ["*"], "allow_credentials": False}
    assert configurar_cors("") == esperado
    assert configurar_cors("*") == esperado


def test_cors_lista_de_origens():
    assert configurar_cors("http://a.com, http://b.com") == {
        "allow_origins": ["http://a.com", "http://b.com"], "allow_credentials": True,
    }


# B4
def test_listar_exercicios_sem_token(client):
    assert client.get("/exercicios").status_code == 401


def test_listar_exercicios_token_invalido(client):
    r = client.get("/exercicios", headers={"Authorization": "Bearer lixo"})
    assert r.status_code == 401


@pytest.mark.parametrize("fixture", ["aluno_headers", "professor_headers", "admin_headers"])
def test_listar_exercicios_qualquer_perfil(client, request, fixture):
    r = client.get("/exercicios", headers=request.getfixturevalue(fixture))
    assert r.status_code == 200


# B5
def test_criar_admin_e_recusa_duplicado(db):
    admin = script_admin.criar_admin(db, "a@teste.com", "segredo1")
    assert admin.tipo == "admin"
    assert admin.senha != "segredo1"
    with pytest.raises(ValueError):
        script_admin.criar_admin(db, "a@teste.com", "outra")


def test_criar_admin_main(db, monkeypatch, capsys):
    from conftest import SessionTeste
    monkeypatch.setattr(script_admin, "SessionLocal", SessionTeste)
    assert script_admin.main(["--email", "x@teste.com", "--senha", "s1"]) == 0
    assert script_admin.main(["--email", "x@teste.com", "--senha", "s1"]) == 1
    assert "já cadastrado" in capsys.readouterr().err
    monkeypatch.setattr(script_admin.getpass, "getpass", lambda _: "pedida")
    assert script_admin.main(["--email", "y@teste.com"]) == 0


# B6
@pytest.fixture
def cloud_perfil(monkeypatch):
    chamadas = {"deletadas": []}
    contador = {"n": 0}

    def upload(arquivo):
        contador["n"] += 1
        assert arquivo.file.read() == b"conteudo"
        return f"https://res.teste/perfil{contador['n']}.png", f"perfil{contador['n']}"

    monkeypatch.setattr(usuarios, "upload_imagem", upload)
    monkeypatch.setattr(usuarios, "deletar_imagem", lambda pid: chamadas["deletadas"].append(pid))
    return chamadas


def _enviar(client, headers, nome="f.png", conteudo=b"conteudo"):
    return client.put("/perfil/foto", files={"arquivo": (nome, io.BytesIO(conteudo), "image/png")}, headers=headers)


def test_foto_upload_substitui_e_expoe_no_perfil(client, aluno_headers, cloud_perfil, db):
    assert _enviar(client, aluno_headers).json() == {"mensagem": "Foto de perfil atualizada com sucesso"}
    assert client.get("/perfil", headers=aluno_headers).json()["foto"] == "https://res.teste/perfil1.png"

    _enviar(client, aluno_headers)
    assert cloud_perfil["deletadas"] == ["perfil1"]
    db.expire_all()
    usuario = db.query(User).filter_by(email="aluno@teste.com").one()
    assert (usuario.foto, usuario.foto_public_id) == ("https://res.teste/perfil2.png", "perfil2")


def test_foto_validacoes(client, aluno_headers, cloud_perfil):
    assert _enviar(client, aluno_headers, nome="f.gif").status_code == 400
    assert _enviar(client, aluno_headers, conteudo=b"x" * (5 * 1024 * 1024 + 1)).status_code == 400


def test_foto_get_redireciona(client, aluno_headers, cloud_perfil):
    assert client.get("/perfil/foto", headers=aluno_headers).status_code == 404
    _enviar(client, aluno_headers)
    r = client.get("/perfil/foto", headers=aluno_headers, follow_redirects=False)
    assert r.status_code == 307
    assert r.headers["location"] == "https://res.teste/perfil1.png"


def test_foto_delete_cloudinary(client, aluno_headers, cloud_perfil):
    _enviar(client, aluno_headers)
    assert client.delete("/perfil/foto", headers=aluno_headers).status_code == 200
    assert cloud_perfil["deletadas"] == ["perfil1"]
    assert client.get("/perfil", headers=aluno_headers).json()["foto"] is None


def test_foto_legada_local(client, aluno_headers, cloud_perfil, db, tmp_path):
    legado = tmp_path / "antiga.png"
    legado.write_bytes(b"png")
    db.query(User).filter_by(email="aluno@teste.com").one().foto = str(legado)
    db.commit()

    r = client.get("/perfil/foto", headers=aluno_headers)
    assert r.status_code == 200 and r.content == b"png"

    _enviar(client, aluno_headers)
    assert not legado.exists()
    assert cloud_perfil["deletadas"] == []


def test_foto_delete_legada_local(client, aluno_headers, db, tmp_path):
    legado = tmp_path / "antiga.png"
    legado.write_bytes(b"png")
    db.query(User).filter_by(email="aluno@teste.com").one().foto = str(legado)
    db.commit()
    assert client.delete("/perfil/foto", headers=aluno_headers).status_code == 200
    assert not legado.exists()


# B7
def test_agora_usa_fuso_configurado():
    from app.core.tempo import agora
    assert config.APP_TIMEZONE == "America/Sao_Paulo"
    assert agora().utcoffset() == timedelta(hours=-3)


class _RelogioFixo(datetime):
    @classmethod
    def now(cls, tz=None):
        # 23h30 de domingo em São Paulo = 02h30 de segunda em UTC
        return datetime(2026, 11, 2, 2, 30, tzinfo=timezone.utc).astimezone(tz)


def test_treino_hoje_usa_fuso_da_aplicacao(client, monkeypatch, professor_headers, aluno_headers, ficha_id):
    from app.core import tempo
    monkeypatch.setattr(tempo, "datetime", _RelogioFixo)
    assert tempo.agora().weekday() == 6  # domingo em São Paulo

    for nome, dia, ordem in (("Dom", "domingo", 1), ("Seg", "segunda", 2)):
        r = client.post("/treino", json={"ficha_id": ficha_id, "nome": nome, "dia_semana": dia, "ordem": ordem},
                        headers=professor_headers)
        assert r.status_code == 200

    r = client.get(f"/treino/hoje/{ficha_id}", headers=aluno_headers)
    assert r.status_code == 200
    assert [t["nome"] for t in r.json()] == ["Dom"]


def test_data_criacao_ficha_e_naive_no_fuso(client, monkeypatch, professor_headers, aluno_id):
    from app.core import tempo
    monkeypatch.setattr(tempo, "datetime", _RelogioFixo)
    r = client.post("/ficha", json={"aluno_id": aluno_id, "nome": "F"}, headers=professor_headers)
    assert r.json()["data_criacao"].startswith("2026-11-01T23:30")


# Correções da revisão (B-1, B-2, B-3)
def _falhar(_):
    raise RuntimeError("cloudinary fora do ar")


def test_foto_put_conclui_mesmo_se_apagar_antiga_falha(client, aluno_headers, cloud_perfil, monkeypatch, db):
    _enviar(client, aluno_headers)
    monkeypatch.setattr(usuarios, "deletar_imagem", _falhar)
    r = _enviar(client, aluno_headers)
    assert r.status_code == 200
    db.expire_all()
    usuario = db.query(User).filter_by(email="aluno@teste.com").one()
    assert (usuario.foto, usuario.foto_public_id) == ("https://res.teste/perfil2.png", "perfil2")


def test_foto_delete_conclui_mesmo_se_apagar_falha(client, aluno_headers, cloud_perfil, monkeypatch, db):
    _enviar(client, aluno_headers)
    monkeypatch.setattr(usuarios, "deletar_imagem", _falhar)
    assert client.delete("/perfil/foto", headers=aluno_headers).status_code == 200
    db.expire_all()
    usuario = db.query(User).filter_by(email="aluno@teste.com").one()
    assert (usuario.foto, usuario.foto_public_id) == (None, None)


def test_criar_admin_avisa_senha_em_argv(db, monkeypatch, capsys):
    from conftest import SessionTeste
    monkeypatch.setattr(script_admin, "SessionLocal", SessionTeste)
    assert script_admin.main(["--email", "w@teste.com", "--senha", "s1"]) == 0
    assert "histórico do shell" in capsys.readouterr().err

    monkeypatch.setattr(script_admin.getpass, "getpass", lambda _: "pedida")
    assert script_admin.main(["--email", "z@teste.com"]) == 0
    assert "histórico do shell" not in capsys.readouterr().err


def test_foto_rejeita_content_type_invalido(client, aluno_headers, cloud_perfil):
    r = client.put("/perfil/foto", files={"arquivo": ("f.png", io.BytesIO(b"conteudo"), "text/plain")}, headers=aluno_headers)
    assert r.status_code == 400
    assert r.json()["detail"] == "Formato de imagem não permitido"
