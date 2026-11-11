"""GA-02a: matriz de permissões das rotas de gestão (admin, recepção com/sem cada permissão, professor, aluno, sem token)."""
import pytest

from gestao_fabrica import TODAS_PERMISSOES, criar_admin, criar_recepcao, headers

PENDENTE = {"aluno_id": 999999, "plano_id": 999999}

# (método, caminho, corpo, permissão exigida da recepção)
ROTAS_COM_PERMISSAO = [
    ("POST", "/gestao/alunos", {"email": "n@x.com", "senha": "senha123", "nome": "N", "telefone": "1", "data_nascimento": "2000-01-01"}, "cadastrar_aluno"),
    ("PUT", "/gestao/alunos/999999", {"nome": "N", "telefone": "1", "data_nascimento": "2000-01-01"}, "editar_aluno"),
    ("POST", "/gestao/alunos/999999/aprovar", None, "aprovar_aluno"),
    ("POST", "/gestao/alunos/999999/recusar", None, "aprovar_aluno"),
    ("POST", "/matriculas", PENDENTE, "matricular"),
    ("POST", "/matriculas/999999/renovar", {}, "renovar_matricula"),
    ("POST", "/matriculas/999999/alterar-plano", {"plano_id": 1}, "alterar_plano"),
    ("POST", "/matriculas/999999/cancelar", {"motivo": "x"}, "cancelar_matricula"),
    ("POST", "/pagamentos/999999/registrar", {"forma": "pix"}, "registrar_pagamento"),
    ("POST", "/pagamentos", {"aluno_id": 999999, "descricao": "x", "valor": "10.00", "forma": "pix"}, "registrar_pagamento"),
    ("POST", "/pagamentos/999999/estornar", {"motivo": "x"}, "estornar_pagamento"),
    ("POST", "/acessos", {"aluno_id": 999999}, "registrar_acesso"),
]

# rotas de leitura da recepção: qualquer recepcionista, mesmo sem permissões
ROTAS_RECEPCAO = [
    ("GET", "/gestao/alunos"), ("GET", "/gestao/alunos/999999"),
    ("GET", "/gestao/alunos/999999/matriculas"), ("GET", "/gestao/alunos/999999/pagamentos"),
    ("GET", "/gestao/alunos/999999/acessos"), ("GET", "/matriculas"), ("GET", "/pagamentos"),
    ("GET", "/pagamentos/999999/comprovante"), ("GET", "/acessos/verificar?aluno_id=999999"),
    ("GET", "/acessos"), ("GET", "/planos"), ("GET", "/recepcao/dashboard"),
]

# só admin
ROTAS_ADMIN = [
    ("GET", "/admin/dashboard", None), ("GET", "/admin/financeiro", None), ("GET", "/admin/auditoria", None),
    ("GET", "/admin/professores", None), ("GET", "/admin/professores/999999", None),
    ("PUT", "/admin/professores/999999", {"nome": "N", "telefone": "1", "email": "a@b.com"}),
    ("PUT", "/admin/professores/999999/status", {"ativo": False}),
    ("POST", "/admin/professores/999999/transferir-alunos", {"destino_professor_id": None}),
    ("GET", "/admin/recepcionistas", None), ("GET", "/admin/recepcionistas/999999", None),
    ("POST", "/admin/recepcionistas", {"email": "r@b.com", "senha": "senha123", "nome": "R", "telefone": "1"}),
    ("PUT", "/admin/recepcionistas/999999", {"nome": "N", "telefone": "1", "email": "a@b.com"}),
    ("PUT", "/admin/recepcionistas/999999/status", {"ativo": False}),
    ("PUT", "/admin/recepcionistas/999999/permissoes", {"permissoes": []}),
    ("POST", "/admin/planos", {"nome": "P", "duracao_dias": 30, "valor": "10.00", "periodicidade": "mensal"}),
    ("PUT", "/admin/planos/999999", {"nome": "P", "duracao_dias": 30, "valor": "10.00", "periodicidade": "mensal"}),
    ("PUT", "/admin/planos/999999/status", {"ativo": False}), ("GET", "/admin/planos/999999/alunos", None),
    ("PUT", "/admin/alunos/999999/status", {"ativo": False}),
    ("PUT", "/admin/alunos/999999/professor", {"professor_id": None}),
    ("PUT", "/admin/alunos/999999/restricao", {"restricao_acesso": None}),
]


def _chamar(client, metodo, caminho, corpo, cabecalhos=None):
    return client.request(metodo, caminho, json=corpo, headers=cabecalhos or {})


@pytest.mark.parametrize("metodo,caminho,corpo,permissao", ROTAS_COM_PERMISSAO)
def test_rotas_com_permissao(client, db, professor_headers, aluno_headers, admin_headers, metodo, caminho, corpo, permissao):
    assert _chamar(client, metodo, caminho, corpo).status_code == 401

    for cabecalhos in (professor_headers, aluno_headers):
        r = _chamar(client, metodo, caminho, corpo, cabecalhos)
        assert r.status_code == 403
        assert r.json()["detail"] == "Acesso não permitido para este perfil"

    sem, _ = criar_recepcao(db, [p for p in TODAS_PERMISSOES if p != permissao], email="sem@gestao.com")
    r = _chamar(client, metodo, caminho, corpo, headers(sem))
    assert r.status_code == 403
    assert r.json()["detail"] == "Permissão insuficiente"

    com, _ = criar_recepcao(db, [permissao], email="com@gestao.com", nome="Com")
    r = _chamar(client, metodo, caminho, corpo, headers(com))
    assert r.status_code not in (401, 403), r.text

    r = _chamar(client, metodo, caminho, corpo, admin_headers)
    assert r.status_code not in (401, 403), r.text


@pytest.mark.parametrize("metodo,caminho", ROTAS_RECEPCAO)
def test_rotas_de_leitura_da_recepcao(client, db, professor_headers, aluno_headers, admin_headers, metodo, caminho):
    assert client.request(metodo, caminho).status_code == 401
    assert client.request(metodo, caminho, headers=professor_headers).status_code == 403
    assert client.request(metodo, caminho, headers=aluno_headers).status_code == 403

    sem_permissoes, _ = criar_recepcao(db, [])
    assert client.request(metodo, caminho, headers=headers(sem_permissoes)).status_code not in (401, 403)
    assert client.request(metodo, caminho, headers=admin_headers).status_code not in (401, 403)


@pytest.mark.parametrize("metodo,caminho,corpo", ROTAS_ADMIN)
def test_rotas_so_do_admin(client, db, professor_headers, aluno_headers, admin_headers, metodo, caminho, corpo):
    assert _chamar(client, metodo, caminho, corpo).status_code == 401
    assert _chamar(client, metodo, caminho, corpo, professor_headers).status_code == 403
    assert _chamar(client, metodo, caminho, corpo, aluno_headers).status_code == 403

    recepcao, _ = criar_recepcao(db, TODAS_PERMISSOES)
    assert _chamar(client, metodo, caminho, corpo, headers(recepcao)).status_code == 403

    assert _chamar(client, metodo, caminho, corpo, admin_headers).status_code not in (401, 403)


def test_planos_leitura_so_para_admin_e_recepcao(client, professor_headers, aluno_headers):
    assert client.get("/planos").status_code == 401
    assert client.get("/planos", headers=professor_headers).status_code == 403
    assert client.get("/planos", headers=aluno_headers).status_code == 403


def test_forcar_acesso_exige_liberar_acesso_manual(client, db):
    from gestao_fabrica import criar_aluno

    aluno = criar_aluno(db)
    sem, _ = criar_recepcao(db, ["registrar_acesso"])

    r = client.post("/acessos", json={"aluno_id": aluno.id, "forcar": True}, headers=headers(sem))

    assert r.status_code == 403
    assert r.json()["detail"] == "Permissão insuficiente"


def test_conta_desativada_da_recepcao_perde_acesso_na_proxima_requisicao(client, db):
    usuario, _ = criar_recepcao(db, TODAS_PERMISSOES)
    assert client.get("/gestao/alunos", headers=headers(usuario)).status_code == 200

    usuario.ativo = False
    db.commit()

    r = client.get("/gestao/alunos", headers=headers(usuario))
    assert r.status_code == 401
    assert r.json()["detail"] == "Conta desativada"
