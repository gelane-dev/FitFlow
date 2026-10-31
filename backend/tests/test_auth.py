DADOS = {
    "email": "novo@teste.com", "senha": "abc12345", "nome": "Novo",
    "telefone": "11988887777", "data_nascimento": "2001-02-03",
}


def test_cadastro_e_login(client):
    r = client.post("/cadastro", json=DADOS)
    assert r.status_code == 200
    assert r.json()["email"] == "novo@teste.com"

    r = client.post("/login", json={"email": DADOS["email"], "senha": DADOS["senha"]})
    assert r.status_code == 200
    assert r.json()["token_type"] == "bearer"
    assert r.json()["access_token"]


def test_cadastro_email_duplicado(client):
    client.post("/cadastro", json=DADOS)
    r = client.post("/cadastro", json=DADOS)
    assert r.status_code == 400
    assert r.json()["detail"] == "E-mail já cadastrado"


def test_login_senha_errada(client):
    client.post("/cadastro", json=DADOS)
    r = client.post("/login", json={"email": DADOS["email"], "senha": "errada"})
    assert r.status_code == 401
    assert r.json()["detail"] == "E-mail ou senha inválidos"


def test_login_email_inexistente(client):
    r = client.post("/login", json={"email": "x@teste.com", "senha": "abc"})
    assert r.status_code == 401


def test_perfil_com_token(client, aluno_headers):
    r = client.get("/perfil", headers=aluno_headers)
    assert r.status_code == 200
    assert r.json()["email"] == "aluno@teste.com"


def test_perfil_sem_token(client):
    assert client.get("/perfil").status_code in (401, 403)


def test_perfil_token_invalido(client):
    r = client.get("/perfil", headers={"Authorization": "Bearer lixo"})
    assert r.status_code == 401
    assert r.json()["detail"] == "Token inválido ou expirado"


def test_token_de_usuario_inexistente_da_401(client, db, aluno_headers):
    from app.models import User, Aluno
    db.query(Aluno).delete()
    db.query(User).filter(User.email == "aluno@teste.com").delete()
    db.commit()
    r = client.get("/ficha/aluno", headers=aluno_headers)
    assert r.status_code == 401
    assert r.json()["detail"] == "Usuário não encontrado"


def test_perfil_sem_linha_de_perfil_da_403(client, db):
    from app.core.seguranca import criar_hash, criar_token
    from app.models import User
    usuario = User(email="sem@perfil.com", senha=criar_hash("x"), tipo="professor")
    db.add(usuario)
    db.commit()
    r = client.get("/ficha", headers={"Authorization": f"Bearer {criar_token(usuario.id)}"})
    assert r.status_code == 403
    assert r.json()["detail"] == "Acesso permitido apenas para professor"


def test_403_por_perfil_errado(client, aluno_headers, professor_headers):
    r = client.post("/exercicios", json={"nome": "a", "descricao": "b", "grupo_muscular": "c"}, headers=aluno_headers)
    assert r.status_code == 403
    assert r.json()["detail"] == "Acesso permitido apenas para professor"

    r = client.get("/ficha/aluno", headers=professor_headers)
    assert r.status_code == 403
    assert r.json()["detail"] == "Acesso permitido apenas para alunos"

    r = client.post("/admin/professores", json={}, headers=professor_headers)
    assert r.status_code == 403
    assert r.json()["detail"] == "Acesso permitido apenas para admin"


def test_admin_cria_professor(client, admin_headers):
    dados = {"email": "novoprof@teste.com", "senha": "abc12345", "nome": "Prof", "telefone": "11911112222"}
    r = client.post("/admin/professores", json=dados, headers=admin_headers)
    assert r.status_code == 200
    assert r.json() == {"mensagem": "Professor criado com sucesso"}

    r = client.post("/login", json={"email": dados["email"], "senha": dados["senha"]})
    token = r.json()["access_token"]
    r = client.get("/perfil/professor", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["nome"] == "Prof"

    r = client.post("/admin/professores", json=dados, headers=admin_headers)
    assert r.status_code == 400
