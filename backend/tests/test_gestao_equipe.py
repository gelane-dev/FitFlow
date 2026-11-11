"""GA-02a: professores, recepcionistas, planos (admin) e auditoria."""
import pytest

from gestao_fabrica import (
    TODAS_PERMISSOES, criar_aluno, criar_matricula, criar_plano, criar_professor, criar_recepcao, dias, headers,
)
from app.core.tempo import agora_naive
from app.models import Auditoria, AvaliacaoFisica, Ficha, Plano, Professor, Recepcionista, User

PADRAO = ["cadastrar_aluno", "editar_aluno", "aprovar_aluno", "matricular", "renovar_matricula",
          "registrar_pagamento", "registrar_acesso"]


def _acoes(db, acao):
    return db.query(Auditoria).filter(Auditoria.acao == acao).all()


# ---------- professores ----------

def test_criar_professor_grava_criado_em_e_auditoria(client, db, admin_headers):
    r = client.post("/admin/professores", headers=admin_headers, json={
        "email": "novo.prof@gestao.com", "senha": "senha123", "nome": "Novo Prof", "telefone": "11999990000"})

    assert r.status_code == 200 and r.json() == {"mensagem": "Professor criado com sucesso"}
    assert db.query(User).filter(User.email == "novo.prof@gestao.com").one().criado_em is not None
    assert len(_acoes(db, "professor.criar")) == 1


def test_listar_professores_com_totais(client, db, admin_headers):
    usuario, prof = criar_professor(db, "Prof A")
    _, vazio = criar_professor(db, "Prof B")
    alunos = [criar_aluno(db, f"Aluno {i}", professor_id=prof.id) for i in range(3)]
    for status, ativo in (("publicada", True), ("rascunho", True), ("publicada", False)):
        db.add(Ficha(aluno_id=alunos[0].id, professor_id=prof.id, nome="F", data_criacao=agora_naive(), status=status, ativo=ativo))
    db.add(AvaliacaoFisica(aluno_id=alunos[0].id, data_avaliacao=agora_naive(), peso=70, altura=170, professor_id=prof.id))
    db.commit()

    r = client.get("/admin/professores", headers=admin_headers)

    assert r.status_code == 200
    por_nome = {p["nome"]: p for p in r.json()}
    assert por_nome["Prof A"]["total_alunos"] == 3 and por_nome["Prof A"]["total_fichas"] == 2
    assert por_nome["Prof A"]["total_avaliacoes"] == 1 and por_nome["Prof A"]["ativo"] is True
    assert por_nome["Prof B"]["total_alunos"] == 0 and por_nome["Prof B"]["total_fichas"] == 0
    assert set(por_nome["Prof A"]) == {"id", "nome", "email", "telefone", "foto", "ativo", "criado_em",
                                       "total_alunos", "total_fichas", "total_avaliacoes"}

    usuario.ativo = False
    db.commit()
    assert [p["nome"] for p in client.get("/admin/professores?ativo=false", headers=admin_headers).json()] == ["Prof A"]
    assert [p["nome"] for p in client.get("/admin/professores?ativo=true", headers=admin_headers).json()] == ["Prof B"]


def test_detalhe_do_professor(client, db, admin_headers):
    usuario, prof = criar_professor(db, "Prof Detalhe")
    aluno = criar_aluno(db, "Do Prof", professor_id=prof.id)
    db.add(Ficha(aluno_id=aluno.id, professor_id=prof.id, nome="Ficha X", data_criacao=agora_naive(), status="rascunho"))
    db.add(AvaliacaoFisica(aluno_id=aluno.id, data_avaliacao=agora_naive(), peso=80.5, altura=180, professor_id=prof.id))
    for i in range(25):
        db.add(Auditoria(user_id=usuario.id, data_hora=agora_naive(), acao="ficha.criar", entidade="ficha", descricao=f"e{i}"))
    db.commit()

    r = client.get(f"/admin/professores/{prof.id}", headers=admin_headers)

    assert r.status_code == 200, r.text
    corpo = r.json()
    assert [a["nome"] for a in corpo["alunos"]] == ["Do Prof"]
    assert corpo["fichas"][0]["nome"] == "Ficha X" and corpo["fichas"][0]["status"] == "rascunho"
    assert corpo["fichas"][0]["aluno"]["nome"] == "Do Prof" and corpo["fichas"][0]["atualizado_em"]
    assert corpo["avaliacoes_recentes"][0]["peso"] == 80.5
    assert len(corpo["atividade"]) == 20 and corpo["atividade"][0]["usuario"]["nome"] == "Prof Detalhe"
    assert client.get("/admin/professores/99999", headers=admin_headers).status_code == 404


def test_editar_professor(client, db, admin_headers):
    usuario, prof = criar_professor(db, "Prof Edita", email="edita@gestao.com")
    criar_professor(db, "Outro", email="outro@gestao.com")
    corpo = {"nome": "Prof Novo Nome", "telefone": "11911112222", "email": "novo@gestao.com"}

    r = client.put(f"/admin/professores/{prof.id}", json=corpo, headers=admin_headers)
    assert r.status_code == 200 and r.json()["nome"] == "Prof Novo Nome" and r.json()["email"] == "novo@gestao.com"
    assert len(_acoes(db, "professor.editar")) == 1

    r = client.put(f"/admin/professores/{prof.id}", json={**corpo, "email": "outro@gestao.com"}, headers=admin_headers)
    assert r.status_code == 400 and r.json()["detail"] == "E-mail já cadastrado"
    r = client.put(f"/admin/professores/{prof.id}", json=corpo, headers=admin_headers)  # o próprio e-mail não conflita
    assert r.status_code == 200
    assert client.put("/admin/professores/99999", json=corpo, headers=admin_headers).status_code == 404


def test_desativar_professor_corta_acesso_e_nao_desvincula_alunos(client, db, admin_headers):
    usuario, prof = criar_professor(db, "Prof Sai")
    aluno = criar_aluno(db, professor_id=prof.id)
    token = headers(usuario)
    assert client.get("/exercicios", headers=token).status_code == 200

    r = client.put(f"/admin/professores/{prof.id}/status", json={"ativo": False}, headers=admin_headers)

    assert r.status_code == 200 and r.json()["ativo"] is False and r.json()["total_alunos"] == 1
    assert client.get("/exercicios", headers=token).status_code == 401
    db.refresh(aluno)
    assert aluno.professor_id == prof.id
    assert len(_acoes(db, "professor.desativar")) == 1
    client.put(f"/admin/professores/{prof.id}/status", json={"ativo": True}, headers=admin_headers)
    assert len(_acoes(db, "professor.ativar")) == 1


def test_transferir_todos_ou_alguns_alunos(client, db, admin_headers):
    _, origem = criar_professor(db, "Origem")
    _, destino = criar_professor(db, "Destino")
    a1, a2, a3 = (criar_aluno(db, f"T{i}", professor_id=origem.id) for i in range(3))
    outro = criar_aluno(db, "Alheio", professor_id=destino.id)

    r = client.post(f"/admin/professores/{origem.id}/transferir-alunos",
                    json={"destino_professor_id": destino.id, "aluno_ids": [a1.id]}, headers=admin_headers)
    assert r.status_code == 200 and r.json() == {"transferidos": 1}
    db.refresh(a1), db.refresh(a2)
    assert a1.professor_id == destino.id and a1.professor_vinculado_em is not None and a2.professor_id == origem.id

    r = client.post(f"/admin/professores/{origem.id}/transferir-alunos",
                    json={"destino_professor_id": destino.id}, headers=admin_headers)
    assert r.json() == {"transferidos": 2}
    db.refresh(a2), db.refresh(a3)
    assert a2.professor_id == destino.id and a3.professor_id == destino.id
    assert len(_acoes(db, "professor.transferir_alunos")) == 2

    r = client.post(f"/admin/professores/{destino.id}/transferir-alunos",
                    json={"destino_professor_id": None}, headers=admin_headers)
    assert r.json() == {"transferidos": 4}
    db.refresh(outro)
    assert outro.professor_id is None and outro.professor_vinculado_em is None


def test_transferir_validacoes(client, db, admin_headers):
    _, origem = criar_professor(db, "Origem")
    _, destino = criar_professor(db, "Destino")
    _, inativo = criar_professor(db, "Inativo", ativo=False)
    aluno = criar_aluno(db, "Meu", professor_id=origem.id)
    de_outro = criar_aluno(db, "DeOutro", professor_id=destino.id)
    url = f"/admin/professores/{origem.id}/transferir-alunos"

    r = client.post(url, json={"destino_professor_id": origem.id}, headers=admin_headers)
    assert r.status_code == 422 and r.json()["detail"] == "Destino deve ser diferente da origem"
    r = client.post(url, json={"destino_professor_id": inativo.id}, headers=admin_headers)
    assert r.status_code == 422 and r.json()["detail"] == "Professor inativo"
    assert client.post(url, json={"destino_professor_id": 99999}, headers=admin_headers).status_code == 404
    r = client.post(url, json={"destino_professor_id": destino.id, "aluno_ids": [aluno.id, de_outro.id]}, headers=admin_headers)
    assert r.status_code == 422 and r.json()["detail"] == "Aluno não pertence ao professor de origem"
    db.refresh(aluno)
    assert aluno.professor_id == origem.id
    assert client.post("/admin/professores/99999/transferir-alunos", json={"destino_professor_id": None}, headers=admin_headers).status_code == 404


# ---------- recepcionistas ----------

def test_criar_recepcionista_com_permissoes_padrao(client, db, admin_headers):
    r = client.post("/admin/recepcionistas", headers=admin_headers, json={
        "email": "nova@gestao.com", "senha": "senha123", "nome": "Nova Recepção", "telefone": "11955550000"})

    assert r.status_code == 200, r.text
    assert r.json()["permissoes"] == PADRAO and r.json()["ativo"] is True and r.json()["criado_em"]
    usuario = db.query(User).filter(User.email == "nova@gestao.com").one()
    assert usuario.tipo == "recepcao" and usuario.criado_em is not None
    assert len(_acoes(db, "recepcionista.criar")) == 1
    assert client.post("/login", json={"email": "nova@gestao.com", "senha": "senha123"}).status_code == 200


def test_criar_recepcionista_com_permissoes_escolhidas_e_validacoes(client, db, admin_headers):
    base = {"email": "r@gestao.com", "senha": "senha123", "nome": "R", "telefone": "1"}

    r = client.post("/admin/recepcionistas", json={**base, "permissoes": ["estornar_pagamento", "matricular", "matricular"]}, headers=admin_headers)
    assert r.status_code == 200 and r.json()["permissoes"] == ["matricular", "estornar_pagamento"]

    assert client.post("/admin/recepcionistas", json={**base, "permissoes": ["voar"]}, headers=admin_headers).status_code == 422
    assert client.post("/admin/recepcionistas", json={**base, "senha": "1"}, headers=admin_headers).status_code == 422
    r = client.post("/admin/recepcionistas", json=base, headers=admin_headers)
    assert r.status_code == 400 and r.json()["detail"] == "E-mail já cadastrado"
    r = client.post("/admin/recepcionistas", json={**base, "permissoes": []}, headers=admin_headers)
    assert r.status_code == 400  # e-mail repetido tem precedência; lista vazia em si é válida
    r = client.post("/admin/recepcionistas", json={**base, "email": "vazia@gestao.com", "permissoes": []}, headers=admin_headers)
    assert r.status_code == 200 and r.json()["permissoes"] == []


def test_listar_detalhar_editar_recepcionista(client, db, admin_headers):
    usuario, perfil = criar_recepcao(db, ["matricular"], email="a@gestao.com", nome="Ana Recep")
    criar_recepcao(db, [], email="b@gestao.com", nome="Bia Recep")
    db.add(Auditoria(user_id=usuario.id, data_hora=agora_naive(), acao="aluno.cadastrar", entidade="aluno", descricao="x"))
    db.commit()

    lista = client.get("/admin/recepcionistas", headers=admin_headers).json()
    assert [r["nome"] for r in lista] == ["Ana Recep", "Bia Recep"]
    assert lista[0]["user_id"] == usuario.id  # o app filtra a auditoria por este id

    detalhe = client.get(f"/admin/recepcionistas/{perfil.id}", headers=admin_headers).json()
    assert detalhe["permissoes"] == ["matricular"] and len(detalhe["atividade"]) == 1
    assert detalhe["user_id"] == usuario.id
    assert detalhe["atividade"][0]["usuario"] == {"id": usuario.id, "nome": "Ana Recep", "tipo": "recepcao"}

    corpo = {"nome": "Ana Nova", "telefone": "11", "email": "ana.nova@gestao.com"}
    assert client.put(f"/admin/recepcionistas/{perfil.id}", json=corpo, headers=admin_headers).json()["nome"] == "Ana Nova"
    r = client.put(f"/admin/recepcionistas/{perfil.id}", json={**corpo, "email": "b@gestao.com"}, headers=admin_headers)
    assert r.status_code == 400
    assert len(_acoes(db, "recepcionista.editar")) == 1
    assert client.get("/admin/recepcionistas/99999", headers=admin_headers).status_code == 404
    assert client.get("/admin/recepcionistas?ativo=false", headers=admin_headers).json() == []


def test_status_e_permissoes_da_recepcionista_valem_na_proxima_requisicao(client, db, admin_headers):
    usuario, perfil = criar_recepcao(db, ["registrar_acesso"])
    aluno = criar_aluno(db)
    token = headers(usuario)
    assert client.post("/matriculas", json={"aluno_id": aluno.id, "plano_id": 1}, headers=token).status_code == 403

    r = client.put(f"/admin/recepcionistas/{perfil.id}/permissoes", json={"permissoes": ["matricular"]}, headers=admin_headers)
    assert r.status_code == 200 and r.json()["permissoes"] == ["matricular"]
    assert client.post("/matriculas", json={"aluno_id": aluno.id, "plano_id": 1}, headers=token).status_code != 403
    assert client.post("/acessos", json={"aluno_id": aluno.id}, headers=token).status_code == 403
    registro, = _acoes(db, "recepcionista.permissoes")
    assert registro.detalhes == {"anteriores": ["registrar_acesso"], "novas": ["matricular"]}
    assert client.put(f"/admin/recepcionistas/{perfil.id}/permissoes", json={"permissoes": ["x"]}, headers=admin_headers).status_code == 422

    assert client.put(f"/admin/recepcionistas/{perfil.id}/status", json={"ativo": False}, headers=admin_headers).json()["ativo"] is False
    r = client.get("/gestao/alunos", headers=token)
    assert r.status_code == 401 and r.json()["detail"] == "Conta desativada"
    assert len(_acoes(db, "recepcionista.desativar")) == 1
    client.put(f"/admin/recepcionistas/{perfil.id}/status", json={"ativo": True}, headers=admin_headers)
    assert client.get("/gestao/alunos", headers=token).status_code == 200
    assert len(_acoes(db, "recepcionista.ativar")) == 1


# ---------- planos ----------

PLANO = {"nome": "Trimestral", "descricao": "3 meses", "duracao_dias": 90, "valor": "270.00",
         "periodicidade": "trimestral", "renovacao_automatica": True, "condicoes": "Sem fidelidade"}


def test_criar_plano(client, db, admin_headers):
    r = client.post("/admin/planos", json=PLANO, headers=admin_headers)

    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["valor"] == "270.00" and corpo["ativo"] is True and corpo["total_alunos"] == 0
    assert corpo["renovacao_automatica"] is True and corpo["duracao_dias"] == 90
    assert len(_acoes(db, "plano.criar")) == 1


@pytest.mark.parametrize("alteracao", [
    {"nome": ""}, {"nome": "   "}, {"duracao_dias": 0}, {"duracao_dias": -1}, {"valor": "-1"},
    {"periodicidade": "quinzenal"}, {"valor": "abc"}, {"valor": "1.999"},
])
def test_plano_invalido_422(client, admin_headers, alteracao):
    assert client.post("/admin/planos", json={**PLANO, **alteracao}, headers=admin_headers).status_code == 422


def test_plano_gratuito_e_permitido(client, admin_headers):
    r = client.post("/admin/planos", json={**PLANO, "valor": "0"}, headers=admin_headers)

    assert r.status_code == 200 and r.json()["valor"] == "0.00"


def test_editar_plano_nao_altera_matriculas_existentes(client, db, admin_headers):
    plano = criar_plano(db, "Mensal", 30, "100.00")
    matricula = criar_matricula(db, criar_aluno(db), plano)

    r = client.put(f"/admin/planos/{plano.id}", json={**PLANO, "nome": "Mensal Plus", "duracao_dias": 60, "valor": "150.00"}, headers=admin_headers)

    assert r.status_code == 200 and r.json()["valor"] == "150.00" and r.json()["total_alunos"] == 1
    db.refresh(matricula)
    assert str(matricula.valor) == "100.00"
    assert (matricula.data_vencimento - matricula.data_inicio).days == 29
    registro, = _acoes(db, "plano.editar")
    assert registro.detalhes == {"valor_anterior": "100.00", "valor": "150.00"}
    assert client.put("/admin/planos/99999", json=PLANO, headers=admin_headers).status_code == 404


def test_ativar_e_desativar_plano(client, db, admin_headers):
    plano = criar_plano(db)

    assert client.put(f"/admin/planos/{plano.id}/status", json={"ativo": False}, headers=admin_headers).json()["ativo"] is False
    assert len(_acoes(db, "plano.desativar")) == 1
    assert client.put(f"/admin/planos/{plano.id}/status", json={"ativo": True}, headers=admin_headers).json()["ativo"] is True
    assert len(_acoes(db, "plano.ativar")) == 1
    assert client.put("/admin/planos/99999/status", json={"ativo": True}, headers=admin_headers).status_code == 404


def test_listar_planos_admin_ve_todos_e_recepcao_so_ativos(client, db, admin_headers):
    ativo = criar_plano(db, "Ativo")
    inativo = criar_plano(db, "Inativo", ativo=False)
    for i in range(2):
        criar_matricula(db, criar_aluno(db, f"P{i}"), ativo)
    criar_matricula(db, criar_aluno(db, "Cancelado"), ativo, status="cancelada")
    recepcao, _ = criar_recepcao(db, [])

    todos = {p["nome"]: p for p in client.get("/planos", headers=admin_headers).json()}
    assert set(todos) == {"Ativo", "Inativo"} and todos["Ativo"]["total_alunos"] == 2 and todos["Inativo"]["total_alunos"] == 0
    assert [p["nome"] for p in client.get("/planos?ativo=false", headers=admin_headers).json()] == ["Inativo"]
    assert [p["nome"] for p in client.get("/planos?ativo=true", headers=admin_headers).json()] == ["Ativo"]

    assert [p["nome"] for p in client.get("/planos", headers=headers(recepcao)).json()] == ["Ativo"]
    assert [p["nome"] for p in client.get("/planos?ativo=false", headers=headers(recepcao)).json()] == ["Ativo"]


def test_alunos_do_plano(client, db, admin_headers):
    plano = criar_plano(db, "Mensal", 30)
    criar_matricula(db, criar_aluno(db, "Ativo Um"), plano, inicio=dias(-5))
    criar_matricula(db, criar_aluno(db, "Antigo"), plano, status="encerrada")

    r = client.get(f"/admin/planos/{plano.id}/alunos", headers=admin_headers)

    assert r.status_code == 200
    assert [(a["nome"], a["situacao"]) for a in r.json()] == [("Ativo Um", "vigente")]
    assert set(r.json()[0]) == {"id", "nome", "email", "telefone", "data_inicio", "data_vencimento", "situacao"}
    assert client.get("/admin/planos/99999/alunos", headers=admin_headers).status_code == 404


# ---------- configuração e auditoria ----------

def test_configuracao_grava_auditoria(client, db, admin_headers):
    corpo = {"nome": "Academia Nova", "horarios": [], "tolerancia_dias_vencimento": 3}

    assert client.put("/admin/configuracao", json=corpo, headers=admin_headers).status_code == 200
    assert len(_acoes(db, "configuracao.editar")) == 1


def _auditar(db, user_id, acao, entidade="aluno", entidade_id=None, quando=None):
    db.add(Auditoria(user_id=user_id, data_hora=quando or agora_naive(), acao=acao, entidade=entidade,
                     entidade_id=entidade_id, descricao=acao))
    db.commit()


def test_auditoria_lista_filtra_e_pagina(client, db, admin_headers):
    usuario, perfil = criar_recepcao(db, TODAS_PERMISSOES)
    _auditar(db, usuario.id, "aluno.cadastrar", "aluno", 7, agora_naive().replace(day=1, month=1, year=2026))
    _auditar(db, usuario.id, "matricula.criar", "matricula", 8)
    _auditar(db, None, "sistema.job", "sistema")
    _auditar(db, usuario.id, "aluno.editar", "aluno", 7)

    def acoes(consulta=""):
        r = client.get(f"/admin/auditoria?{consulta}", headers=admin_headers)
        assert r.status_code == 200
        return [i["acao"] for i in r.json()["itens"]]

    assert acoes() == ["aluno.editar", "sistema.job", "matricula.criar", "aluno.cadastrar"]  # mais recentes primeiro
    assert acoes(f"user_id={usuario.id}") == ["aluno.editar", "matricula.criar", "aluno.cadastrar"]
    assert acoes("acao=matricula.criar") == ["matricula.criar"]
    assert acoes("entidade=aluno") == ["aluno.editar", "aluno.cadastrar"]
    assert acoes("entidade=aluno&entidade_id=7") == ["aluno.editar", "aluno.cadastrar"]
    assert acoes("entidade_id=8") == ["matricula.criar"]
    assert acoes("inicio=2026-01-01&fim=2026-01-01") == ["aluno.cadastrar"]
    assert acoes("fim=2026-01-31") == ["aluno.cadastrar"]
    assert "aluno.cadastrar" not in acoes(f"inicio={agora_naive().date()}")
    assert acoes("acao=nao.existe") == []

    pagina = client.get("/admin/auditoria?por_pagina=3&pagina=2", headers=admin_headers).json()
    assert pagina["total"] == 4 and len(pagina["itens"]) == 1 and pagina["pagina"] == 2

    itens = client.get("/admin/auditoria", headers=admin_headers).json()["itens"]
    por_acao = {i["acao"]: i for i in itens}
    assert por_acao["aluno.editar"]["usuario"] == {"id": usuario.id, "nome": "Recepção Um", "tipo": "recepcao"}
    assert por_acao["sistema.job"]["usuario"] is None
    assert set(itens[0]) == {"id", "data_hora", "acao", "entidade", "entidade_id", "descricao", "detalhes", "usuario"}


def test_auditoria_mostra_admin_pelo_email(client, db, admin_headers):
    admin = db.query(User).filter(User.tipo == "admin").first()
    _auditar(db, admin.id, "plano.criar", "plano")

    item = client.get("/admin/auditoria?acao=plano.criar", headers=admin_headers).json()["itens"][0]

    assert item["usuario"]["tipo"] == "admin" and item["usuario"]["nome"] == admin.email
