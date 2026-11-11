"""GA-02a: /gestao/alunos (cadastro, edição, aprovação, listagem filtrada/paginada) e /admin/alunos/{id}/..."""
import pytest
from sqlalchemy import event

from conftest import engine_teste
from gestao_fabrica import (
    TODAS_PERMISSOES, criar_acesso, criar_aluno, criar_matricula, criar_pagamento, criar_plano,
    criar_professor, criar_recepcao, dias, headers,
)
from app.models import Aluno, Auditoria, User

NOVO = {
    "email": "novo@gestao.com", "senha": "senha123", "nome": "Novo Aluno", "telefone": "11999990000",
    "data_nascimento": "2001-02-03", "cpf": "529.982.247-25", "endereco": "Rua A, 1", "observacoes": "obs",
}


@pytest.fixture
def recepcao(db):
    usuario, _ = criar_recepcao(db, TODAS_PERMISSOES)
    return headers(usuario)


def _acoes(db, acao):
    return db.query(Auditoria).filter(Auditoria.acao == acao).all()


# ---------- cadastro ----------

def test_cadastrar_aluno_nasce_aprovado_com_auditoria(client, db, recepcao):
    r = client.post("/gestao/alunos", json=NOVO, headers=recepcao)

    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["status_cadastro"] == "aprovado"
    assert corpo["ativo"] is True
    assert corpo["situacao"] == "sem_matricula"
    assert corpo["cpf"] == "52998224725"  # normalizado: só dígitos
    assert len(corpo["codigo_acesso"]) == 16
    assert corpo["criado_em"] is not None
    usuario = db.query(User).filter(User.email == "novo@gestao.com").one()
    assert usuario.tipo == "aluno" and usuario.criado_em is not None
    registros = _acoes(db, "aluno.cadastrar")
    assert len(registros) == 1 and registros[0].entidade_id == corpo["id"]


def test_cadastrar_aluno_pode_logar_logo_depois(client, recepcao):
    client.post("/gestao/alunos", json=NOVO, headers=recepcao)

    assert client.post("/login", json={"email": NOVO["email"], "senha": "senha123"}).status_code == 200


def test_cadastrar_email_ou_cpf_repetido_400(client, db, recepcao):
    assert client.post("/gestao/alunos", json=NOVO, headers=recepcao).status_code == 200

    mesmo_email = client.post("/gestao/alunos", json={**NOVO, "cpf": "111.444.777-35"}, headers=recepcao)
    assert mesmo_email.status_code == 400 and mesmo_email.json()["detail"] == "E-mail já cadastrado"

    mesmo_cpf = client.post("/gestao/alunos", json={**NOVO, "email": "outro@gestao.com"}, headers=recepcao)
    assert mesmo_cpf.status_code == 400 and mesmo_cpf.json()["detail"] == "CPF já cadastrado"
    assert db.query(Aluno).count() == 1


def test_cadastrar_valida_campos_422(client, recepcao):
    for ruim in ({**NOVO, "email": "invalido"}, {**NOVO, "senha": "123"}, {**NOVO, "nome": ""},
                 {**NOVO, "data_nascimento": "ontem"}, {**NOVO, "cpf": "1" * 15}):
        assert client.post("/gestao/alunos", json=ruim, headers=recepcao).status_code == 422


def test_admin_cadastra_com_professor_e_recepcao_nao(client, db, admin_headers, recepcao):
    _, professor = criar_professor(db)

    r = client.post("/gestao/alunos", json={**NOVO, "professor_id": professor.id}, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["professor"] == {"id": professor.id, "nome": professor.nome}
    assert db.get(Aluno, r.json()["id"]).professor_vinculado_em is not None

    r = client.post("/gestao/alunos", json={**NOVO, "email": "b@gestao.com", "cpf": None, "professor_id": professor.id}, headers=recepcao)
    assert r.status_code == 403 and r.json()["detail"] == "Permissão insuficiente"


def test_cadastrar_com_professor_inativo_ou_inexistente(client, db, admin_headers):
    _, inativo = criar_professor(db, ativo=False)

    r = client.post("/gestao/alunos", json={**NOVO, "professor_id": inativo.id}, headers=admin_headers)
    assert r.status_code == 422 and r.json()["detail"] == "Professor inativo"

    r = client.post("/gestao/alunos", json={**NOVO, "professor_id": 99999}, headers=admin_headers)
    assert r.status_code == 404 and r.json()["detail"] == "Professor não encontrado"


# ---------- edição ----------

def test_editar_aluno_com_auditoria_e_sem_trocar_email(client, db, recepcao):
    aluno = criar_aluno(db, "Maria")

    r = client.put(f"/gestao/alunos/{aluno.id}", headers=recepcao, json={
        "nome": "Maria Silva", "telefone": "11988887777", "data_nascimento": "1990-01-01",
        "cpf": "111.444.777-35", "endereco": "Rua B", "observacoes": None,
    })

    assert r.status_code == 200, r.text
    assert r.json()["nome"] == "Maria Silva" and r.json()["cpf"] == "11144477735" and r.json()["email"] == "maria@gestao.com"
    assert len(_acoes(db, "aluno.editar")) == 1


def test_editar_cpf_de_outro_aluno_400_e_inexistente_404(client, db, recepcao):
    criar_aluno(db, "Ana", cpf="11144477735")
    bia = criar_aluno(db, "Bia")
    corpo = {"nome": "Bia", "telefone": "1", "data_nascimento": "1990-01-01", "cpf": "111.444.777-35"}

    r = client.put(f"/gestao/alunos/{bia.id}", json=corpo, headers=recepcao)
    assert r.status_code == 400 and r.json()["detail"] == "CPF já cadastrado"

    r = client.put(f"/gestao/alunos/{bia.id}", json={**corpo, "cpf": "390.533.447-05"}, headers=recepcao)
    assert r.status_code == 200

    r = client.put("/gestao/alunos/99999", json=corpo, headers=recepcao)
    assert r.status_code == 404 and r.json()["detail"] == "Aluno não encontrado"


def test_editar_mantendo_o_proprio_cpf_nao_conflita(client, db, recepcao):
    aluno = criar_aluno(db, "Ana", cpf="11144477735")

    r = client.put(f"/gestao/alunos/{aluno.id}", headers=recepcao,
                   json={"nome": "Ana", "telefone": "1", "data_nascimento": "1990-01-01", "cpf": "111.444.777-35"})

    assert r.status_code == 200


# ---------- aprovação ----------

def test_aprovar_e_recusar_somente_pendente(client, db, recepcao):
    pendente = criar_aluno(db, "Pendente", status="pendente")
    recusado = criar_aluno(db, "Recusavel", status="pendente")

    r = client.post(f"/gestao/alunos/{pendente.id}/aprovar", headers=recepcao)
    assert r.status_code == 200 and r.json()["status_cadastro"] == "aprovado" and r.json()["aprovado_em"]
    assert len(_acoes(db, "aluno.aprovar")) == 1

    r = client.post(f"/gestao/alunos/{recusado.id}/recusar", headers=recepcao)
    assert r.status_code == 200 and r.json()["status_cadastro"] == "recusado"
    assert len(_acoes(db, "aluno.recusar")) == 1

    for rota in ("aprovar", "recusar"):
        r = client.post(f"/gestao/alunos/{pendente.id}/{rota}", headers=recepcao)
        assert r.status_code == 409 and r.json()["detail"] == "Cadastro não está pendente"

    assert client.post("/gestao/alunos/99999/aprovar", headers=recepcao).status_code == 404


def test_aluno_aprovado_consegue_logar(client, db, recepcao):
    pendente = criar_aluno(db, "Pendente", email="p@gestao.com", status="pendente")
    assert client.post("/login", json={"email": "p@gestao.com", "senha": "senha123"}).status_code == 403

    client.post(f"/gestao/alunos/{pendente.id}/aprovar", headers=recepcao)

    assert client.post("/login", json={"email": "p@gestao.com", "senha": "senha123"}).status_code == 200


# ---------- listagem ----------

@pytest.fixture
def cenario(db):
    """Um aluno em cada situação, com valores conhecidos."""
    _, prof = criar_professor(db, "Prof Um")
    mensal = criar_plano(db, "Mensal", 30)
    anual = criar_plano(db, "Anual", 365, "900.00", periodicidade="anual")

    vigente = criar_aluno(db, "Vigente", professor_id=prof.id, cpf="777.000")
    criar_matricula(db, vigente, anual, inicio=dias(-10))

    vencendo = criar_aluno(db, "Vencendo", telefone="11000000001")
    criar_matricula(db, vencendo, mensal, inicio=dias(-25))  # vence em 4 dias (alerta padrão 7)

    vencida = criar_aluno(db, "Vencida")
    criar_matricula(db, vencida, mensal, inicio=dias(-40))

    sem = criar_aluno(db, "Sem Matricula", email="semmat@exemplo.com")

    pendente = criar_aluno(db, "Pendente", status="pendente")
    desativado = criar_aluno(db, "Desativado", ativo=False)

    inadimplente = criar_aluno(db, "Inadimplente")
    criar_matricula(db, inadimplente, mensal, inicio=dias(-5))
    criar_pagamento(db, inadimplente, vencimento=dias(-3))

    return dict(prof=prof, mensal=mensal, anual=anual)


def _nomes(r):
    return [i["nome"] for i in r.json()["itens"]]


@pytest.mark.parametrize("situacao,esperado", [
    ("vigente", ["Vigente", "Inadimplente"]),
    ("vencendo", ["Vencendo"]),
    ("vencida", ["Vencida"]),
    ("sem_matricula", ["Desativado", "Pendente", "Sem Matricula"]),
    ("pendente", ["Pendente"]),
    ("desativado", ["Desativado"]),
    ("inadimplente", ["Inadimplente"]),
])
def test_filtro_de_situacao(client, recepcao, cenario, situacao, esperado):
    r = client.get(f"/gestao/alunos?situacao={situacao}", headers=recepcao)

    assert r.status_code == 200
    assert sorted(_nomes(r)) == sorted(esperado)
    assert r.json()["total"] == len(esperado)


def test_item_da_listagem_tem_todos_os_campos(client, recepcao, cenario):
    r = client.get("/gestao/alunos?busca=Vencendo", headers=recepcao)

    item = r.json()["itens"][0]
    assert set(item) == {
        "id", "nome", "email", "telefone", "foto", "ativo", "status_cadastro", "professor", "plano_atual",
        "data_vencimento", "situacao", "inadimplente", "criado_em",
    }
    assert item["situacao"] == "vencendo"
    assert item["plano_atual"]["nome"] == "Mensal"
    assert item["data_vencimento"] == dias(-25 + 29).isoformat()
    assert item["professor"] is None and item["inadimplente"] is False


def test_situacao_invalida_422(client, recepcao):
    assert client.get("/gestao/alunos?situacao=xyz", headers=recepcao).status_code == 422


def test_busca_por_nome_email_telefone_e_cpf(client, recepcao, cenario):
    assert _nomes(client.get("/gestao/alunos?busca=vigen", headers=recepcao)) == ["Vigente"]
    assert sorted(_nomes(client.get("/gestao/alunos?busca=semmat@", headers=recepcao))) == ["Sem Matricula"]
    assert _nomes(client.get("/gestao/alunos?busca=11000000001", headers=recepcao)) == ["Vencendo"]
    assert _nomes(client.get("/gestao/alunos?busca=777.0", headers=recepcao)) == ["Vigente"]
    assert _nomes(client.get("/gestao/alunos?busca=inexistente", headers=recepcao)) == []


def test_filtro_por_professor_sem_professor_e_plano(client, recepcao, cenario):
    r = client.get(f"/gestao/alunos?professor_id={cenario['prof'].id}", headers=recepcao)
    assert _nomes(r) == ["Vigente"]

    r = client.get("/gestao/alunos?professor_id=0", headers=recepcao)
    assert r.json()["total"] == 6 and "Vigente" not in _nomes(r)

    r = client.get(f"/gestao/alunos?plano_id={cenario['anual'].id}", headers=recepcao)
    assert _nomes(r) == ["Vigente"]
    r = client.get(f"/gestao/alunos?plano_id={cenario['mensal'].id}", headers=recepcao)
    assert sorted(_nomes(r)) == ["Inadimplente", "Vencendo", "Vencida"]


def test_paginacao(client, recepcao, cenario):
    r = client.get("/gestao/alunos?pagina=2&por_pagina=3", headers=recepcao)

    corpo = r.json()
    assert corpo["total"] == 7 and corpo["pagina"] == 2 and corpo["por_pagina"] == 3
    assert len(corpo["itens"]) == 3
    primeira = client.get("/gestao/alunos?pagina=1&por_pagina=3", headers=recepcao).json()["itens"]
    assert {i["id"] for i in primeira}.isdisjoint({i["id"] for i in corpo["itens"]})
    assert client.get("/gestao/alunos?pagina=3&por_pagina=3", headers=recepcao).json()["itens"].__len__() == 1
    assert client.get("/gestao/alunos?por_pagina=101", headers=recepcao).status_code == 422
    assert client.get("/gestao/alunos?pagina=0", headers=recepcao).status_code == 422
    assert client.get("/gestao/alunos", headers=recepcao).json()["por_pagina"] == 20


def test_listagem_nao_faz_n_mais_1(client, db, recepcao):
    plano = criar_plano(db)

    def consultas(quantidade):
        for i in range(quantidade):
            aluno = criar_aluno(db, f"Lote {quantidade} {i}")
            criar_matricula(db, aluno, plano)
        total = []

        def contar(conexao, cursor, statement, *args):
            total.append(statement)

        event.listen(engine_teste, "before_cursor_execute", contar)
        try:
            assert client.get("/gestao/alunos?por_pagina=100", headers=recepcao).status_code == 200
        finally:
            event.remove(engine_teste, "before_cursor_execute", contar)
        return len(total)

    pequeno = consultas(3)
    grande = consultas(30)

    assert grande == pequeno


# ---------- detalhe e históricos ----------

def test_detalhe_do_aluno(client, db, recepcao, cenario):
    aluno = db.query(Aluno).filter(Aluno.nome == "Vencendo").one()

    r = client.get(f"/gestao/alunos/{aluno.id}", headers=recepcao)

    corpo = r.json()
    assert r.status_code == 200
    assert corpo["codigo_acesso"] == aluno.codigo_acesso
    assert corpo["matricula_atual"]["plano"]["nome"] == "Mensal"
    assert corpo["matricula_atual"]["situacao"] == "vencendo"
    assert corpo["matricula_atual"]["valor"] == "99.90"
    for campo in ("cpf", "endereco", "observacoes", "data_nascimento", "restricao_acesso", "aprovado_em"):
        assert campo in corpo
    assert client.get("/gestao/alunos/99999", headers=recepcao).status_code == 404


def test_historicos_do_aluno(client, db, recepcao):
    aluno = criar_aluno(db, "Historia")
    plano = criar_plano(db)
    antiga = criar_matricula(db, aluno, plano, inicio=dias(-60), status="encerrada")
    criar_matricula(db, aluno, plano, inicio=dias(-10))
    criar_pagamento(db, aluno, "10.00", dias(-5))
    for _ in range(3):
        criar_acesso(db, aluno)

    matriculas = client.get(f"/gestao/alunos/{aluno.id}/matriculas", headers=recepcao).json()
    assert {m["status"] for m in matriculas} == {"ativa", "encerrada"}
    assert antiga.id in [m["id"] for m in matriculas]

    pagamentos = client.get(f"/gestao/alunos/{aluno.id}/pagamentos", headers=recepcao).json()
    assert len(pagamentos) == 1 and pagamentos[0]["vencido"] is True

    acessos = client.get(f"/gestao/alunos/{aluno.id}/acessos?por_pagina=2", headers=recepcao).json()
    assert acessos["total"] == 3 and len(acessos["itens"]) == 2

    for sufixo in ("matriculas", "pagamentos", "acessos"):
        assert client.get(f"/gestao/alunos/99999/{sufixo}", headers=recepcao).status_code == 404


# ---------- rotas do admin ----------

def test_admin_desativa_e_reativa_aluno(client, db, admin_headers):
    aluno = criar_aluno(db, "Alvo", email="alvo@gestao.com")

    r = client.put(f"/admin/alunos/{aluno.id}/status", json={"ativo": False}, headers=admin_headers)
    assert r.status_code == 200 and r.json()["ativo"] is False
    assert client.post("/login", json={"email": "alvo@gestao.com", "senha": "senha123"}).status_code == 403
    assert len(_acoes(db, "aluno.desativar")) == 1

    r = client.put(f"/admin/alunos/{aluno.id}/status", json={"ativo": True}, headers=admin_headers)
    assert r.json()["ativo"] is True and len(_acoes(db, "aluno.ativar")) == 1
    assert client.put("/admin/alunos/99999/status", json={"ativo": True}, headers=admin_headers).status_code == 404


def test_admin_troca_professor_do_aluno(client, db, admin_headers):
    _, ativo = criar_professor(db, "Ativo")
    _, inativo = criar_professor(db, "Inativo", ativo=False)
    aluno = criar_aluno(db, "Troca")

    r = client.put(f"/admin/alunos/{aluno.id}/professor", json={"professor_id": ativo.id}, headers=admin_headers)
    assert r.status_code == 200 and r.json()["professor"]["id"] == ativo.id
    db.refresh(aluno)
    assert aluno.professor_vinculado_em is not None

    r = client.put(f"/admin/alunos/{aluno.id}/professor", json={"professor_id": inativo.id}, headers=admin_headers)
    assert r.status_code == 422 and r.json()["detail"] == "Professor inativo"

    r = client.put(f"/admin/alunos/{aluno.id}/professor", json={"professor_id": 99999}, headers=admin_headers)
    assert r.status_code == 404

    r = client.put(f"/admin/alunos/{aluno.id}/professor", json={"professor_id": None}, headers=admin_headers)
    assert r.status_code == 200 and r.json()["professor"] is None
    db.refresh(aluno)
    assert aluno.professor_vinculado_em is None
    assert len(_acoes(db, "aluno.trocar_professor")) == 2


def test_admin_define_e_remove_restricao(client, db, admin_headers):
    aluno = criar_aluno(db, "Restrito")

    r = client.put(f"/admin/alunos/{aluno.id}/restricao", json={"restricao_acesso": "Débito antigo"}, headers=admin_headers)
    assert r.status_code == 200 and r.json()["restricao_acesso"] == "Débito antigo"

    r = client.put(f"/admin/alunos/{aluno.id}/restricao", json={"restricao_acesso": None}, headers=admin_headers)
    assert r.json()["restricao_acesso"] is None
    assert len(_acoes(db, "aluno.restricao")) == 2
