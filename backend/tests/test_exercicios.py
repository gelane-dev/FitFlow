def _criar(client, headers, nome="Supino", grupo="peito"):
    return client.post("/exercicios", json={"nome": nome, "descricao": "desc", "grupo_muscular": grupo}, headers=headers)


def test_crud_exercicio(client, professor_headers):
    r = _criar(client, professor_headers)
    assert r.status_code == 200
    id_ = r.json()["id"]

    r = client.get(f"/exercicios/{id_}", headers=professor_headers)
    assert r.json()["nome"] == "Supino"

    r = client.put(f"/exercicios/{id_}", json={"nome": "Supino reto", "descricao": "d", "grupo_muscular": "peito"}, headers=professor_headers)
    assert r.status_code == 200
    assert r.json()["nome"] == "Supino reto"

    r = client.get("/exercicios/999", headers=professor_headers)
    assert r.status_code == 404
    assert r.json()["detail"] == "Exercicio não encontrado"


def test_listagem_paginada_e_filtros(client, professor_headers):
    for i in range(5):
        _criar(client, professor_headers, nome=f"Ex {i}", grupo="perna" if i < 2 else "costas")

    r = client.get("/exercicios?pagina=1&limite=2", headers=professor_headers)
    corpo = r.json()
    assert r.status_code == 200
    assert corpo["total"] == 5
    assert corpo["total_paginas"] == 3
    assert len(corpo["itens"]) == 2

    r = client.get("/exercicios?pagina=3&limite=2", headers=professor_headers)
    assert len(r.json()["itens"]) == 1

    assert client.get("/exercicios?grupo_muscular=perna", headers=professor_headers).json()["total"] == 2
    assert client.get("/exercicios?busca=Ex 4", headers=professor_headers).json()["total"] == 1
    assert client.get("/exercicios?limite=1000", headers=professor_headers).status_code == 422


def test_exclusao_logica(client, professor_headers):
    id_ = _criar(client, professor_headers).json()["id"]
    r = client.delete(f"/exercicios/{id_}", headers=professor_headers)
    assert r.status_code == 200

    assert client.get(f"/exercicios/{id_}", headers=professor_headers).status_code == 404
    assert client.get("/exercicios", headers=professor_headers).json()["total"] == 0
    assert client.delete(f"/exercicios/{id_}", headers=professor_headers).status_code == 404


def test_upload_imagem_e_exclusao_remove_midia(client, professor_headers, cloudinary_falso):
    id_ = _criar(client, professor_headers).json()["id"]
    r = client.put(f"/exercicios/{id_}/imagem", files={"arquivo": ("a.png", b"xxx", "image/png")}, headers=professor_headers)
    assert r.status_code == 200
    assert client.get(f"/exercicios/{id_}", headers=professor_headers).json()["imagem"] == "http://img.teste/a.png"

    r = client.put(f"/exercicios/{id_}/imagem", files={"arquivo": ("a.gif", b"xxx", "image/gif")}, headers=professor_headers)
    assert r.status_code == 400

    r = client.put(f"/exercicios/{id_}/video", files={"arquivo": ("a.mp4", b"xxx", "video/mp4")}, headers=professor_headers)
    assert r.status_code == 200

    client.delete(f"/exercicios/{id_}", headers=professor_headers)
    assert "img_id" in cloudinary_falso["deletar_imagem"]
    assert "vid_id" in cloudinary_falso["deletar_video"]


def test_aluno_nao_cria_exercicio(client, aluno_headers):
    assert _criar(client, aluno_headers).status_code == 403
