"""GA-07: GET/PUT /perfil/recepcao (permissões para o app mostrar ou esconder ações)."""
from gestao_fabrica import TODAS_PERMISSOES, criar_recepcao, headers


def test_get_devolve_dados_e_permissoes(client, db):
    usuario, perfil = criar_recepcao(db, ["registrar_acesso", "matricular"], nome="Maria Recepção")

    r = client.get("/perfil/recepcao", headers=headers(usuario))

    assert r.status_code == 200
    assert r.json() == {
        "id": perfil.id,
        "nome": "Maria Recepção",
        "telefone": "11911110000",
        "permissoes": ["registrar_acesso", "matricular"],
    }


def test_put_altera_nome_e_telefone_sem_mexer_nas_permissoes(client, db):
    usuario, perfil = criar_recepcao(db, TODAS_PERMISSOES)

    r = client.put(
        "/perfil/recepcao",
        json={"nome": "Novo Nome", "telefone": "11999998888", "permissoes": []},
        headers=headers(usuario),
    )

    assert r.status_code == 200
    corpo = r.json()
    assert corpo["nome"] == "Novo Nome"
    assert corpo["telefone"] == "11999998888"
    assert corpo["permissoes"] == TODAS_PERMISSOES
    assert client.get("/perfil/recepcao", headers=headers(usuario)).json()["nome"] == "Novo Nome"


def test_put_exige_nome_e_telefone(client, db):
    usuario, _ = criar_recepcao(db, [])

    assert client.put("/perfil/recepcao", json={"nome": "X"}, headers=headers(usuario)).status_code == 422


def test_outros_perfis_e_anonimo_nao_acessam(client, db, admin_headers, professor_headers, aluno_headers):
    assert client.get("/perfil/recepcao").status_code == 401

    for cabecalhos in (admin_headers, professor_headers, aluno_headers):
        r = client.get("/perfil/recepcao", headers=cabecalhos)
        assert r.status_code == 403
        assert r.json()["detail"] == "Acesso não permitido para este perfil"
        assert client.put(
            "/perfil/recepcao", json={"nome": "X", "telefone": "1"}, headers=cabecalhos
        ).status_code == 403


def test_conta_desativada_perde_acesso(client, db):
    usuario, _ = criar_recepcao(db, [], ativo=False)

    assert client.get("/perfil/recepcao", headers=headers(usuario)).status_code == 401


def test_put_rejeita_nome_vazio_e_valores_acima_do_limite(client, db):
    usuario, _ = criar_recepcao(db, [])
    cab = headers(usuario)

    for corpo in (
        {"nome": "", "telefone": "11"},
        {"nome": "Ana", "telefone": ""},
        {"nome": "A" * 151, "telefone": "11"},
        {"nome": "Ana", "telefone": "1" * 21},
    ):
        assert client.put("/perfil/recepcao", json=corpo, headers=cab).status_code == 422, corpo
    ok = client.put("/perfil/recepcao", json={"nome": "A" * 150, "telefone": "1" * 20}, headers=cab)
    assert ok.status_code == 200
