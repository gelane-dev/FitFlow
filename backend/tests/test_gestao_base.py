"""GA-01: autenticação por cookie, contas desativadas, cadastro pendente, permissões,
escopo do professor, configuração e auditoria (docs/contracts/Contrato-Gestao.md)."""
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from conftest import SessionTeste, _criar_usuario, _headers, vincular
from app.core.config import JWT_EXPIRA_MINUTOS
from app.core.seguranca import exigir_papeis, exigir_permissao, verificar_professor_ou_admin
from app.database import get_db
from app.models import Aluno, Auditoria, ConfiguracaoAcademia, Professor, Recepcionista, User
from app.services import auditoria
from app.services.configuracao import obter_configuracao


def _login(client, email, senha="senha123"):
    return client.post("/login", json={"email": email, "senha": senha})


def _definir(db, email, **campos):
    usuario = db.query(User).filter(User.email == email).one()
    for campo, valor in campos.items():
        setattr(usuario, campo, valor)
    db.commit()
    return usuario


def _definir_aluno(db, nome, **campos):
    aluno = db.query(Aluno).filter(Aluno.nome == nome).one()
    for campo, valor in campos.items():
        setattr(aluno, campo, valor)
    db.commit()


# ---------- login, cookie e logout ----------

def test_login_grava_cookie_httponly(client, db, aluno_headers):
    r = _login(client, "aluno@teste.com")

    assert r.status_code == 200
    assert r.json()["token_type"] == "bearer"
    cookie = r.headers["set-cookie"]
    assert cookie.startswith("fitflow_sessao=" + r.json()["access_token"])
    assert "HttpOnly" in cookie
    assert "Path=/" in cookie
    assert "SameSite=lax" in cookie
    assert f"Max-Age={JWT_EXPIRA_MINUTOS * 60}" in cookie
    assert "Secure" not in cookie


def test_login_conta_desativada_403(client, db, aluno_headers):
    _definir(db, "aluno@teste.com", ativo=False)

    r = _login(client, "aluno@teste.com")

    assert r.status_code == 403
    assert r.json()["detail"] == "Conta desativada"
    assert "set-cookie" not in r.headers


def test_login_senha_errada_continua_401(client, db, aluno_headers):
    assert _login(client, "aluno@teste.com", "errada").status_code == 401


@pytest.mark.parametrize("status_cadastro,mensagem", [
    ("pendente", "Cadastro aguardando aprovação da recepção"),
    ("recusado", "Cadastro não aprovado. Procure a recepção"),
])
def test_login_aluno_pendente_ou_recusado_403(client, db, aluno_headers, status_cadastro, mensagem):
    _definir_aluno(db, "Aluno", status_cadastro=status_cadastro)

    r = _login(client, "aluno@teste.com")

    assert r.status_code == 403
    assert r.json()["detail"] == mensagem
    assert "set-cookie" not in r.headers


def test_login_senha_errada_de_aluno_pendente_nao_revela_status(client, db, aluno_headers):
    _definir_aluno(db, "Aluno", status_cadastro="pendente")

    assert _login(client, "aluno@teste.com", "errada").status_code == 401


def test_cookie_e_aceito_em_get_sem_header_authorization(client, db, aluno_headers):
    assert _login(client, "aluno@teste.com").status_code == 200

    r = client.get("/perfil")

    assert r.status_code == 200
    assert r.json()["email"] == "aluno@teste.com"
    assert r.json()["ativo"] is True


def test_cookie_em_escrita_exige_header_de_origem(client, db, aluno_headers):
    assert _login(client, "aluno@teste.com").status_code == 200
    corpo = {"nome": "Novo Nome", "telefone": "11911112222", "data_nascimento": "2000-01-01"}

    sem = client.put("/perfil/aluno", json=corpo)
    assert sem.status_code == 403
    assert sem.json()["detail"] == "Requisição sem cabeçalho de origem"

    errado = client.put("/perfil/aluno", json=corpo, headers={"X-FitFlow-Client": "outro"})
    assert errado.status_code == 403

    com = client.put("/perfil/aluno", json=corpo, headers={"X-FitFlow-Client": "web"})
    assert com.status_code == 200
    assert db.query(Aluno).filter(Aluno.nome == "Novo Nome").count() == 1


def test_bearer_em_escrita_nao_exige_header_de_origem(client, db, aluno_headers):
    corpo = {"nome": "Via Bearer", "telefone": "11911112222", "data_nascimento": "2000-01-01"}

    r = client.put("/perfil/aluno", json=corpo, headers=aluno_headers)

    assert r.status_code == 200


def test_sem_token_e_sem_cookie_continua_nao_autenticado(client):
    assert client.get("/perfil").status_code in (401, 403)


def test_token_valido_de_conta_desativada_vira_401(client, db, aluno_headers):
    assert client.get("/perfil", headers=aluno_headers).status_code == 200
    _definir(db, "aluno@teste.com", ativo=False)

    for rota in ("/perfil", "/ficha/aluno", "/avaliacoes"):
        r = client.get(rota, headers=aluno_headers)
        assert r.status_code == 401, rota
        assert r.json()["detail"] == "Conta desativada"


def test_cookie_de_conta_desativada_vira_401(client, db, aluno_headers):
    assert _login(client, "aluno@teste.com").status_code == 200
    _definir(db, "aluno@teste.com", ativo=False)

    r = client.get("/perfil")

    assert r.status_code == 401
    assert r.json()["detail"] == "Conta desativada"


def test_logout_apaga_cookie_e_nao_exige_token(client, db, aluno_headers):
    assert _login(client, "aluno@teste.com").status_code == 200
    assert client.get("/perfil").status_code == 200

    r = client.post("/logout")

    assert r.status_code == 200
    assert r.json() == {"mensagem": "Sessão encerrada"}
    assert "fitflow_sessao=" in r.headers["set-cookie"]
    assert "Max-Age=0" in r.headers["set-cookie"]
    assert client.get("/perfil").status_code in (401, 403)


def test_logout_sem_sessao_tambem_responde_200(client):
    assert client.post("/logout").status_code == 200


# ---------- cadastro ----------

def test_cadastro_cria_aluno_pendente_com_criado_em(client, db):
    r = client.post("/cadastro", json={
        "email": "novo@teste.com", "senha": "senha123", "nome": "Novo",
        "telefone": "11999990000", "data_nascimento": "2001-02-03",
    })

    assert r.status_code == 200
    assert r.json()["ativo"] is True
    usuario = db.query(User).filter(User.email == "novo@teste.com").one()
    assert usuario.criado_em is not None
    assert usuario.tipo == "aluno"
    aluno = db.query(Aluno).filter(Aluno.user_id == usuario.id).one()
    assert aluno.status_cadastro == "pendente"
    assert aluno.professor_id is None
    assert len(aluno.codigo_acesso) == 16

    login = _login(client, "novo@teste.com")
    assert login.status_code == 403
    assert login.json()["detail"] == "Cadastro aguardando aprovação da recepção"


def test_aluno_aprovado_loga_normalmente_depois_de_aprovado(client, db):
    client.post("/cadastro", json={
        "email": "novo@teste.com", "senha": "senha123", "nome": "Novo",
        "telefone": "11999990000", "data_nascimento": "2001-02-03",
    })
    _definir_aluno(db, "Novo", status_cadastro="aprovado")

    assert _login(client, "novo@teste.com", "senha123").status_code == 200


def test_codigo_acesso_e_unico_por_aluno(db, ids_divergentes):
    for i in range(5):
        _criar_usuario(db, f"a{i}@teste.com", "aluno", f"Aluno {i}")

    codigos = [a.codigo_acesso for a in db.query(Aluno).all()]

    assert len(codigos) == len(set(codigos)) == 5


# ---------- exigir_papeis / exigir_permissao / professor_ou_admin ----------

@pytest.fixture
def app_protegida():
    app = FastAPI()

    def _get_db():
        sessao = SessionTeste()
        try:
            yield sessao
        finally:
            sessao.close()

    app.dependency_overrides[get_db] = _get_db

    @app.get("/so-admin-e-recepcao")
    def so_admin_e_recepcao(usuario=Depends(exigir_papeis("admin", "recepcao"))):
        return {"tipo": usuario.tipo}

    @app.get("/matricular")
    def matricular(usuario=Depends(exigir_permissao("matricular"))):
        return {"tipo": usuario.tipo}

    @app.get("/prof-ou-admin")
    def prof_ou_admin(ator=Depends(verificar_professor_ou_admin)):
        return {"tipo": ator[0], "perfil": type(ator[1]).__name__}

    return TestClient(app)


def _recepcao(db, email, permissoes):
    usuario = _criar_usuario(db, email, "recepcao", "Recepção")
    db.add(Recepcionista(user_id=usuario.id, nome="Recepção", telefone="11900000000", permissoes=permissoes))
    db.commit()
    return _headers(usuario)


def test_exigir_papeis(app_protegida, db, admin_headers, aluno_headers, professor_headers):
    assert app_protegida.get("/so-admin-e-recepcao", headers=admin_headers).status_code == 200
    recepcao = _recepcao(db, "rec@teste.com", [])
    assert app_protegida.get("/so-admin-e-recepcao", headers=recepcao).json() == {"tipo": "recepcao"}

    for headers in (aluno_headers, professor_headers):
        r = app_protegida.get("/so-admin-e-recepcao", headers=headers)
        assert r.status_code == 403
        assert r.json()["detail"] == "Acesso não permitido para este perfil"


def test_exigir_permissao_admin_sempre_passa(app_protegida, admin_headers):
    r = app_protegida.get("/matricular", headers=admin_headers)

    assert r.status_code == 200
    assert r.json() == {"tipo": "admin"}


def test_exigir_permissao_recepcao_com_e_sem_permissao(app_protegida, db):
    com = _recepcao(db, "com@teste.com", ["matricular", "registrar_acesso"])
    sem = _recepcao(db, "sem@teste.com", ["registrar_acesso"])

    assert app_protegida.get("/matricular", headers=com).status_code == 200
    r = app_protegida.get("/matricular", headers=sem)
    assert r.status_code == 403
    assert r.json()["detail"] == "Permissão insuficiente"


def test_exigir_permissao_recepcao_sem_cadastro_de_permissoes_e_negada(app_protegida, db):
    usuario = _criar_usuario(db, "orfa@teste.com", "recepcao", "Órfã")

    assert app_protegida.get("/matricular", headers=_headers(usuario)).status_code == 403


def test_exigir_permissao_outros_perfis_403(app_protegida, aluno_headers, professor_headers):
    for headers in (aluno_headers, professor_headers):
        r = app_protegida.get("/matricular", headers=headers)
        assert r.status_code == 403
        assert r.json()["detail"] == "Acesso não permitido para este perfil"


def test_exigir_permissao_recepcao_desativada_401(app_protegida, db):
    headers = _recepcao(db, "rec@teste.com", ["matricular"])
    _definir(db, "rec@teste.com", ativo=False)

    r = app_protegida.get("/matricular", headers=headers)

    assert r.status_code == 401
    assert r.json()["detail"] == "Conta desativada"


def test_verificar_professor_ou_admin(app_protegida, admin_headers, professor_headers, aluno_headers):
    assert app_protegida.get("/prof-ou-admin", headers=admin_headers).json() == {"tipo": "admin", "perfil": "User"}
    assert app_protegida.get("/prof-ou-admin", headers=professor_headers).json() == {"tipo": "professor", "perfil": "Professor"}
    assert app_protegida.get("/prof-ou-admin", headers=aluno_headers).status_code == 403


# ---------- escopo do professor (ADR-033) ----------

@pytest.fixture
def cenario(db, client, aluno_id, professor_headers, outro_professor_headers, admin_headers, exercicio_id):
    """aluno_id vinculado a "Professor"; "Professor 2" e o admin são os outros atores."""
    return {
        "aluno_id": aluno_id,
        "exercicio_id": exercicio_id,
        "dono": professor_headers,
        "outro": outro_professor_headers,
        "admin": admin_headers,
    }


def _rotas_de_leitura(aluno_id, exercicio_id):
    return [
        f"/alunos/{aluno_id}",
        f"/alunos/{aluno_id}/avaliacoes",
        f"/alunos/{aluno_id}/historico",
        f"/alunos/{aluno_id}/sessoes",
        f"/alunos/{aluno_id}/evolucao/exercicios",
        f"/alunos/{aluno_id}/evolucao/exercicios/{exercicio_id}",
    ]


def _acesso_permitido(resposta) -> bool:
    """200, ou o 404 próprio da evolução de exercício sem histórico (o aluno em si foi achado)."""
    if resposta.status_code == 200:
        return True
    return resposta.status_code == 404 and resposta.json()["detail"] == "Sem registros para este exercício"


def test_professor_vinculado_acessa_todas_as_familias_de_rota(client, cenario):
    for rota in _rotas_de_leitura(cenario["aluno_id"], cenario["exercicio_id"]):
        r = client.get(rota, headers=cenario["dono"])
        assert _acesso_permitido(r), (rota, r.text)


def test_professor_nao_vinculado_recebe_404_em_cada_familia(client, cenario):
    for rota in _rotas_de_leitura(cenario["aluno_id"], cenario["exercicio_id"]):
        r = client.get(rota, headers=cenario["outro"])
        assert r.status_code == 404, rota
        assert r.json()["detail"] == "Aluno não encontrado", rota


def test_admin_acessa_rotas_de_leitura_de_qualquer_aluno(client, cenario):
    for rota in _rotas_de_leitura(cenario["aluno_id"], cenario["exercicio_id"]):
        r = client.get(rota, headers=cenario["admin"])
        assert _acesso_permitido(r), (rota, r.text)


def test_aluno_e_recepcao_nao_usam_rotas_de_aluno_do_professor(client, db, cenario, aluno_headers):
    recepcao = _recepcao(db, "rec@teste.com", ["cadastrar_aluno"])
    for headers in (aluno_headers, recepcao):
        assert client.get("/alunos", headers=headers).status_code == 403
        assert client.get(f"/alunos/{cenario['aluno_id']}/avaliacoes", headers=headers).status_code == 403


def test_inexistente_e_nao_vinculado_dao_a_mesma_resposta(client, cenario):
    inexistente = client.get("/alunos/99999/avaliacoes", headers=cenario["outro"])
    nao_vinculado = client.get(f"/alunos/{cenario['aluno_id']}/avaliacoes", headers=cenario["outro"])

    assert (inexistente.status_code, inexistente.json()) == (nao_vinculado.status_code, nao_vinculado.json())


def test_listar_alunos_so_devolve_os_vinculados(client, db, cenario):
    _criar_usuario(db, "livre@teste.com", "aluno", "Sem Professor")

    dono = client.get("/alunos", headers=cenario["dono"])
    outro = client.get("/alunos", headers=cenario["outro"])
    admin = client.get("/alunos", headers=cenario["admin"])

    assert [a["nome"] for a in dono.json()] == ["Aluno"]
    assert outro.json() == []
    assert {a["nome"] for a in admin.json()} == {"Aluno", "Sem Professor"}


def test_criar_avaliacao_de_aluno_nao_vinculado_404(client, cenario):
    corpo = {"data_avaliacao": "2026-11-01T10:00:00", "peso": 70, "altura": 1.7}

    nao = client.post(f"/alunos/{cenario['aluno_id']}/avaliacoes", json=corpo, headers=cenario["outro"])
    sim = client.post(f"/alunos/{cenario['aluno_id']}/avaliacoes", json=corpo, headers=cenario["dono"])

    assert nao.status_code == 404
    assert nao.json()["detail"] == "Aluno não encontrado"
    assert sim.status_code == 200


def test_criar_ficha_para_aluno_nao_vinculado_404(client, cenario):
    nao = client.post("/ficha", json={"aluno_id": cenario["aluno_id"], "nome": "X"}, headers=cenario["outro"])
    sim = client.post("/ficha", json={"aluno_id": cenario["aluno_id"], "nome": "X"}, headers=cenario["dono"])

    assert nao.status_code == 404
    assert nao.json()["detail"] == "Aluno não encontrado"
    assert sim.status_code == 200


def test_vinculo_se_perde_quando_professor_muda(client, db, cenario):
    aluno = db.query(Aluno).filter(Aluno.id == cenario["aluno_id"]).one()
    aluno.professor_id = db.query(Professor).filter(Professor.nome == "Professor 2").one().id
    db.commit()

    assert client.get(f"/alunos/{cenario['aluno_id']}", headers=cenario["dono"]).status_code == 404
    assert client.get(f"/alunos/{cenario['aluno_id']}", headers=cenario["outro"]).status_code == 200


# ---------- configuração ----------

def test_get_configuracao_exige_autenticacao(client, aluno_headers, professor_headers, admin_headers):
    assert client.get("/configuracao").status_code in (401, 403)

    for headers in (aluno_headers, professor_headers, admin_headers):
        r = client.get("/configuracao", headers=headers)
        assert r.status_code == 200
        assert r.json() == {"nome": "FitFlow", "endereco": None, "telefone": None, "email": None, "horarios": []}


def test_get_admin_configuracao_so_admin(client, admin_headers, professor_headers, aluno_headers):
    r = client.get("/admin/configuracao", headers=admin_headers)

    assert r.status_code == 200
    assert r.json()["tolerancia_dias_vencimento"] == 0
    assert r.json()["bloquear_pagamento_pendente"] is False
    assert r.json()["dias_alerta_vencimento"] == 7
    assert r.json()["dias_reavaliacao"] == 90
    assert r.json()["dias_atualizar_treino"] == 60
    assert client.get("/admin/configuracao", headers=professor_headers).status_code == 403
    assert client.get("/admin/configuracao", headers=aluno_headers).status_code == 403


CONFIGURACAO = {
    "nome": "Academia Teste",
    "endereco": "Rua A, 10",
    "telefone": "1133334444",
    "email": "contato@academia.com",
    "horarios": [
        {"dia": "segunda", "abre": "06:00", "fecha": "22:00", "fechado": False},
        {"dia": "domingo", "abre": "08:00", "fecha": "12:00", "fechado": True},
    ],
    "tolerancia_dias_vencimento": 3,
    "bloquear_pagamento_pendente": True,
    "dias_alerta_vencimento": 10,
    "dias_reavaliacao": 60,
    "dias_atualizar_treino": 45,
}


def test_put_configuracao_grava_e_publica_dados_publicos(client, db, admin_headers, aluno_headers):
    r = client.put("/admin/configuracao", json=CONFIGURACAO, headers=admin_headers)

    assert r.status_code == 200
    assert r.json()["nome"] == "Academia Teste"
    assert r.json()["tolerancia_dias_vencimento"] == 3
    assert r.json()["bloquear_pagamento_pendente"] is True
    assert r.json()["atualizado_em"] is not None
    publico = client.get("/configuracao", headers=aluno_headers).json()
    assert publico["nome"] == "Academia Teste"
    assert publico["horarios"][0] == {"dia": "segunda", "abre": "06:00", "fecha": "22:00", "fechado": False}
    assert "tolerancia_dias_vencimento" not in publico
    assert db.query(ConfiguracaoAcademia).count() == 1


def test_put_configuracao_so_admin(client, professor_headers, aluno_headers):
    assert client.put("/admin/configuracao", json=CONFIGURACAO, headers=professor_headers).status_code == 403
    assert client.put("/admin/configuracao", json=CONFIGURACAO, headers=aluno_headers).status_code == 403


@pytest.mark.parametrize("alteracao", [
    {"horarios": [{"dia": "segunda", "abre": "6:00", "fecha": "22:00", "fechado": False}]},
    {"horarios": [{"dia": "segunda", "abre": "06:00", "fecha": "24:00", "fechado": False}]},
    {"horarios": [{"dia": "segunda", "abre": "06:00", "fecha": "22h", "fechado": False}]},
    {"horarios": [{"dia": "feriado", "abre": "06:00", "fecha": "22:00", "fechado": False}]},
    {"tolerancia_dias_vencimento": -1},
    {"dias_alerta_vencimento": -5},
    {"dias_reavaliacao": -1},
    {"dias_atualizar_treino": -1},
    {"nome": ""},
])
def test_put_configuracao_valida_entrada(client, admin_headers, alteracao):
    r = client.put("/admin/configuracao", json={**CONFIGURACAO, **alteracao}, headers=admin_headers)

    assert r.status_code == 422


def test_obter_configuracao_cria_a_linha_unica_quando_falta(db):
    assert db.query(ConfiguracaoAcademia).count() == 0

    primeira = obter_configuracao(db)
    segunda = obter_configuracao(db)

    assert primeira.id == segunda.id == 1
    assert db.query(ConfiguracaoAcademia).count() == 1


# ---------- auditoria ----------

def test_put_configuracao_grava_auditoria(client, db, admin_headers):
    client.put("/admin/configuracao", json=CONFIGURACAO, headers=admin_headers)

    registro = db.query(Auditoria).filter(Auditoria.acao == "configuracao.editar").one()
    admin = db.query(User).filter(User.email == "admin@teste.com").one()
    assert registro.user_id == admin.id
    assert registro.entidade == "configuracao"
    assert registro.entidade_id == 1
    assert registro.data_hora is not None


def test_criar_professor_grava_criado_em_e_auditoria(client, db, admin_headers):
    r = client.post("/admin/professores", json={
        "email": "novo.prof@teste.com", "senha": "senha123", "nome": "Novo Prof", "telefone": "11999990000",
    }, headers=admin_headers)

    assert r.status_code == 200
    usuario = db.query(User).filter(User.email == "novo.prof@teste.com").one()
    assert usuario.criado_em is not None
    professor = db.query(Professor).filter(Professor.user_id == usuario.id).one()
    registro = db.query(Auditoria).filter(Auditoria.acao == "professor.criar").one()
    assert registro.entidade == "professor"
    assert registro.entidade_id == professor.id


def test_auditoria_registrar_vai_na_mesma_transacao(db, ids_divergentes):
    admin = _criar_usuario(db, "adm@teste.com", "admin", "Adm")

    auditoria.registrar(db, admin, "teste.acao", "teste", 7, "descrição", {"chave": "valor"})
    db.rollback()
    assert db.query(Auditoria).count() == 0

    auditoria.registrar(db, admin, "teste.acao", "teste", 7, "descrição", {"chave": "valor"})
    db.commit()
    registro = db.query(Auditoria).one()
    assert (registro.acao, registro.entidade, registro.entidade_id) == ("teste.acao", "teste", 7)
    assert registro.detalhes == {"chave": "valor"}
    assert registro.user_id == admin.id


def test_auditoria_aceita_ator_nulo_e_corta_descricao(db):
    auditoria.registrar(db, None, "sistema.acao", "sistema", None, "x" * 500)
    db.commit()

    registro = db.query(Auditoria).one()
    assert registro.user_id is None
    assert len(registro.descricao) == 300


# ---------- scripts ----------

def test_criar_admin_grava_criado_em(db):
    from app.scripts.criar_admin import criar_admin

    admin = criar_admin(db, "novo.admin@teste.com", "senha123")

    assert admin.criado_em is not None
    assert admin.ativo is True


def test_criar_demo_vincula_aluno_ao_professor_e_grava_criado_em(db, client):
    from app.scripts.criar_demo import EMAIL_ALUNO, EMAIL_PROFESSOR, SENHA_DEMO, criar_demo

    criar_demo(db)

    professor_user = db.query(User).filter(User.email == EMAIL_PROFESSOR).one()
    aluno_user = db.query(User).filter(User.email == EMAIL_ALUNO).one()
    assert professor_user.criado_em is not None and aluno_user.criado_em is not None
    aluno = db.query(Aluno).filter(Aluno.user_id == aluno_user.id).one()
    professor = db.query(Professor).filter(Professor.user_id == professor_user.id).one()
    assert aluno.professor_id == professor.id
    vinculado_em = aluno.professor_vinculado_em
    assert vinculado_em is not None

    criar_demo(db)  # idempotente: não troca o vínculo nem a data
    db.refresh(aluno)
    assert aluno.professor_id == professor.id
    assert aluno.professor_vinculado_em == vinculado_em

    token = _login(client, EMAIL_PROFESSOR, SENHA_DEMO).json()["access_token"]
    alunos = client.get("/alunos", headers={"Authorization": f"Bearer {token}"})
    assert [a["nome"] for a in alunos.json()] == ["Ana Demo"]


def test_criar_demo_nao_revincula_aluno_transferido(db):
    from app.scripts.criar_demo import EMAIL_ALUNO, criar_demo

    criar_demo(db)
    _criar_usuario(db, "p9@teste.com", "professor", "P9")
    outro = db.query(Professor).filter(Professor.nome == "P9").one()
    aluno = db.query(Aluno).join(User, Aluno.user_id == User.id).filter(User.email == EMAIL_ALUNO).one()
    aluno.professor_id = outro.id
    db.commit()

    criar_demo(db)
    db.refresh(aluno)

    assert aluno.professor_id == outro.id

