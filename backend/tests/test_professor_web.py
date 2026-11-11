"""GA-02b: backend do professor web — rascunho/publicação/versões, duplicação, admin em fichas,
treino sem dia, observação do item, exercícios, circunferências, dashboard e frequência
(docs/contracts/Contrato-Gestao.md)."""
from datetime import date, datetime, timedelta

import pytest

from conftest import _criar_usuario, _headers, dia_hoje, vincular
from app.core.tempo import agora_naive
from app.models import (
    Acesso, Aluno, Auditoria, AvaliacaoFisica, ConfiguracaoAcademia, Ficha, FichaVersao, ItemFicha,
    Matricula, Plano, Professor, SessaoTreino, Treino, User,
)

CIRCUNFERENCIAS = [
    "cintura", "quadril", "abdomen", "peito", "braco_direito",
    "braco_esquerdo", "coxa_direita", "coxa_esquerda", "panturrilha",
]


def _criar_ficha(client, headers, aluno_id, **extra):
    r = client.post("/ficha", json={"aluno_id": aluno_id, "nome": "Ficha", **extra}, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


def _criar_treino(client, headers, ficha_id, ordem=1, **extra):
    corpo = {"ficha_id": ficha_id, "nome": f"Treino {ordem}", "dia_semana": dia_hoje(), "ordem": ordem, **extra}
    r = client.post("/treino", json=corpo, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _criar_exercicio(client, headers, nome="Supino"):
    r = client.post("/exercicios", json={"nome": nome, "descricao": "d", "grupo_muscular": "peito"}, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _criar_item(client, headers, ficha_id, treino_id, exercicio_id, ordem=1, **extra):
    corpo = {"ficha_id": ficha_id, "treino_id": treino_id, "exercicio_id": exercicio_id,
             "series": 3, "repeticoes": 10, "carga": 20.0, "descanso": 60, "ordem": ordem, **extra}
    r = client.post("/ficha/itens", json=corpo, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()["id"]


# ---------- rascunho invisível ao aluno ----------

def test_ficha_sem_status_e_publicada_e_cria_versao_1(client, professor_headers, aluno_id):
    ficha = _criar_ficha(client, professor_headers, aluno_id, objetivo="Hipertrofia")

    assert ficha["status"] == "publicada"
    assert ficha["objetivo"] == "Hipertrofia"
    assert ficha["atualizado_em"] is not None
    versoes = client.get(f"/ficha/{ficha['id']}/versoes", headers=professor_headers).json()
    assert [v["numero"] for v in versoes] == [1]


def test_rascunho_invisivel_ao_aluno_em_todas_as_rotas(client, professor_headers, aluno_headers, aluno_id):
    ficha = _criar_ficha(client, professor_headers, aluno_id, status="rascunho")
    assert ficha["status"] == "rascunho"
    # rascunho não cria versão
    assert client.get(f"/ficha/{ficha['id']}/versoes", headers=professor_headers).json() == []
    treino_id = _criar_treino(client, professor_headers, ficha["id"])
    item_id = _criar_item(client, professor_headers, ficha["id"], treino_id, _criar_exercicio(client, professor_headers))

    assert client.get("/ficha/aluno", headers=aluno_headers).json() == []
    assert client.get(f"/ficha/{ficha['id']}", headers=aluno_headers).status_code == 404
    assert client.get(f"/treino/hoje/{ficha['id']}", headers=aluno_headers).status_code == 404
    assert client.post("/sessoes", json={"treino_id": treino_id}, headers=aluno_headers).status_code == 404
    execucao = {"item_ficha_id": item_id, "data_execucao": "2026-03-01T08:00:00",
                "series_realizadas": 3, "repeticoes_realizadas": 10, "carga_utilizada": 20, "observacao": None}
    assert client.post("/ficha/treino", json=execucao, headers=aluno_headers).status_code == 404

    # o professor continua vendo (lista, completa, filtro por status)
    assert [f["id"] for f in client.get("/ficha?status=rascunho", headers=professor_headers).json()] == [ficha["id"]]
    assert client.get(f"/ficha/{ficha['id']}/completa", headers=professor_headers).json()["status"] == "rascunho"

    # publicar libera todas as rotas do aluno
    assert client.post(f"/ficha/{ficha['id']}/publicar", headers=professor_headers).status_code == 200
    assert [f["id"] for f in client.get("/ficha/aluno", headers=aluno_headers).json()] == [ficha["id"]]
    assert client.get(f"/ficha/{ficha['id']}", headers=aluno_headers).status_code == 200
    assert client.get(f"/treino/hoje/{ficha['id']}", headers=aluno_headers).status_code == 200
    assert client.post("/sessoes", json={"treino_id": treino_id}, headers=aluno_headers).status_code == 200
    assert client.post("/ficha/treino", json=execucao, headers=aluno_headers).status_code == 200


# ---------- versões ----------

def test_publicar_cria_versoes_sequenciais(client, db, professor_headers, aluno_id):
    ficha = _criar_ficha(client, professor_headers, aluno_id, status="rascunho")

    r1 = client.post(f"/ficha/{ficha['id']}/publicar", headers=professor_headers)
    r2 = client.post(f"/ficha/{ficha['id']}/publicar", headers=professor_headers)

    assert (r1.json()["numero"], r2.json()["numero"]) == (1, 2)
    assert r1.json()["publicada_por"]["nome"] == "Professor"
    assert r1.json()["publicada_por"]["tipo"] == "professor"
    lista = client.get(f"/ficha/{ficha['id']}/versoes", headers=professor_headers).json()
    assert [v["numero"] for v in lista] == [2, 1]
    assert db.get(Ficha, ficha["id"]).status == "publicada"
    assert client.get(f"/ficha/{ficha['id']}/versoes/9", headers=professor_headers).status_code == 404


def test_versao_congela_o_estado_da_ficha(client, professor_headers, aluno_id, ficha_id, treino_id, item_id):
    client.post(f"/ficha/{ficha_id}/publicar", headers=professor_headers)  # versão 2 (a 1 nasceu vazia)
    v2 = client.get(f"/ficha/{ficha_id}/versoes/2", headers=professor_headers).json()["conteudo"]
    assert v2["treinos"][0]["itens"][0]["carga"] == 20.0

    atual = {"series": 4, "repeticoes": 8, "carga": 55.0, "descanso": 90, "ordem": 1, "observacao": "novo"}
    assert client.put(f"/ficha/item/{item_id}", json=atual, headers=professor_headers).status_code == 200
    client.put(f"/ficha/{ficha_id}", json={"nome": "Renomeada"}, headers=professor_headers)

    congelada = client.get(f"/ficha/{ficha_id}/versoes/2", headers=professor_headers).json()["conteudo"]
    assert congelada["nome"] == "Ficha A"
    assert congelada["treinos"][0]["itens"][0]["carga"] == 20.0
    assert congelada["treinos"][0]["itens"][0]["observacao"] is None

    client.post(f"/ficha/{ficha_id}/publicar", headers=professor_headers)
    v3 = client.get(f"/ficha/{ficha_id}/versoes/3", headers=professor_headers).json()
    assert v3["conteudo"]["nome"] == "Renomeada"
    assert v3["conteudo"]["treinos"][0]["itens"][0]["carga"] == 55.0
    assert v3["conteudo"]["treinos"][0]["itens"][0]["observacao"] == "novo"
    # a versão 2 segue intacta
    assert client.get(f"/ficha/{ficha_id}/versoes/2", headers=professor_headers).json()["conteudo"]["nome"] == "Ficha A"


def test_versoes_so_do_professor_responsavel(client, professor_headers, outro_professor_headers, ficha_id):
    assert client.get(f"/ficha/{ficha_id}/versoes", headers=outro_professor_headers).status_code == 403
    assert client.post(f"/ficha/{ficha_id}/publicar", headers=outro_professor_headers).status_code == 403
    assert client.get("/ficha/99999/versoes", headers=professor_headers).status_code == 404


def test_aluno_nao_acessa_versoes_nem_publicar(client, aluno_headers, ficha_id):
    assert client.get(f"/ficha/{ficha_id}/versoes", headers=aluno_headers).status_code == 403
    assert client.post(f"/ficha/{ficha_id}/publicar", headers=aluno_headers).status_code == 403


# ---------- duplicar ficha e item ----------

def test_duplicar_ficha_copia_so_itens_ativos_como_rascunho(
        client, db, professor_headers, aluno_headers, aluno_id, ficha_id, treino_id, item_id, exercicio_id):
    outro_exercicio = _criar_exercicio(client, professor_headers, "Remada")
    item_excluido = _criar_item(client, professor_headers, ficha_id, treino_id, outro_exercicio, ordem=2,
                                observacao="manter")
    client.delete(f"/ficha/item/{item_excluido}", headers=professor_headers)
    segundo = _criar_exercicio(client, professor_headers, "Crucifixo")
    _criar_item(client, professor_headers, ficha_id, treino_id, segundo, ordem=3, observacao="copiar")

    r = client.post(f"/ficha/{ficha_id}/duplicar", json={}, headers=professor_headers)

    assert r.status_code == 200, r.text
    nova = r.json()
    assert nova["id"] != ficha_id
    assert nova["status"] == "rascunho"
    assert nova["nome"] == "Ficha A (cópia)"
    assert nova["aluno_id"] == aluno_id
    assert nova["total_treinos"] == 1
    completa = client.get(f"/ficha/{nova['id']}/completa", headers=professor_headers).json()
    assert [i["ordem"] for i in completa["treinos"][0]["itens"]] == [1, 3]
    assert completa["treinos"][0]["itens"][1]["observacao"] == "copiar"
    # a cópia é independente da original e invisível ao aluno
    assert completa["treinos"][0]["id"] != treino_id
    assert [f["id"] for f in client.get("/ficha/aluno", headers=aluno_headers).json()] == [ficha_id]
    assert db.get(Ficha, nova["id"]).professor_id == db.get(Ficha, ficha_id).professor_id


def test_duplicar_ficha_para_outro_aluno_vinculado_e_nome(client, db, professor_headers, ficha_id):
    _criar_usuario(db, "novo@teste.com", "aluno", "Novo Aluno")
    novo_id = vincular(db, "Novo Aluno", "Professor")

    r = client.post(f"/ficha/{ficha_id}/duplicar", json={"aluno_id": novo_id, "nome": "Para o novo"},
                    headers=professor_headers)

    assert (r.json()["aluno_id"], r.json()["nome"]) == (novo_id, "Para o novo")


def test_duplicar_ficha_para_aluno_nao_acessivel_404(client, db, professor_headers, ficha_id):
    _criar_usuario(db, "livre@teste.com", "aluno", "Aluno Livre")  # sem professor
    livre = db.query(Aluno).filter(Aluno.nome == "Aluno Livre").one().id

    r = client.post(f"/ficha/{ficha_id}/duplicar", json={"aluno_id": livre}, headers=professor_headers)

    assert r.status_code == 404
    assert r.json()["detail"] == "Aluno não encontrado"


def test_duplicar_ficha_de_outro_professor_403(client, outro_professor_headers, ficha_id):
    assert client.post(f"/ficha/{ficha_id}/duplicar", json={}, headers=outro_professor_headers).status_code == 403


def test_duplicar_item_vai_logo_abaixo_e_reordena(client, db, professor_headers, ficha_id, treino_id, item_id):
    e2, e3 = _criar_exercicio(client, professor_headers, "B"), _criar_exercicio(client, professor_headers, "C")
    segundo = _criar_item(client, professor_headers, ficha_id, treino_id, e2, ordem=2)
    terceiro = _criar_item(client, professor_headers, ficha_id, treino_id, e3, ordem=3)

    r = client.post(f"/ficha/item/{item_id}/duplicar", headers=professor_headers)

    assert r.status_code == 200, r.text
    copia = r.json()
    assert copia["ordem"] == 2 and copia["id"] not in (item_id, segundo, terceiro)
    assert copia["exercicio_id"] == db.get(ItemFicha, item_id).exercicio_id
    ordens = {i.id: i.ordem for i in db.query(ItemFicha).filter(ItemFicha.treino_id == treino_id)}
    assert ordens == {item_id: 1, copia["id"]: 2, segundo: 3, terceiro: 4}


def test_duplicar_item_de_outro_professor_403_e_inexistente_404(client, outro_professor_headers, item_id):
    assert client.post(f"/ficha/item/{item_id}/duplicar", headers=outro_professor_headers).status_code == 403
    assert client.post("/ficha/item/9999/duplicar", headers=outro_professor_headers).status_code == 404


# ---------- admin e auditoria ----------

def test_admin_le_e_edita_ficha_alheia_com_auditoria_do_admin(
        client, db, admin_headers, professor_headers, ficha_id, treino_id, item_id):
    admin = db.query(User).filter(User.email == "admin@teste.com").one()
    dono = db.get(Ficha, ficha_id).professor_id

    assert client.get(f"/ficha/{ficha_id}/completa", headers=admin_headers).status_code == 200
    assert client.get("/ficha", headers=admin_headers).json()[0]["id"] == ficha_id
    assert client.get(f"/treino/ficha/{ficha_id}", headers=admin_headers).status_code == 200
    assert client.put(f"/ficha/{ficha_id}", json={"nome": "Pelo admin", "objetivo": "Força"},
                      headers=admin_headers).status_code == 200
    assert client.put(f"/treino/{treino_id}", json={"nome": "T", "dia_semana": None, "ordem": 1},
                      headers=admin_headers).status_code == 200
    assert client.put(f"/ficha/item/{item_id}", headers=admin_headers,
                      json={"series": 5, "repeticoes": 5, "carga": 40, "descanso": 30, "ordem": 1}).status_code == 200
    assert client.post(f"/ficha/{ficha_id}/publicar", headers=admin_headers).json()["publicada_por"]["tipo"] == "admin"

    ficha = db.get(Ficha, ficha_id)
    db.refresh(ficha)
    assert ficha.professor_id == dono  # o professor original é mantido
    assert (ficha.nome, ficha.objetivo) == ("Pelo admin", "Força")
    acoes = {a.acao: a for a in db.query(Auditoria).filter(Auditoria.user_id == admin.id)}
    assert {"ficha.editar", "treino.editar", "item.editar", "ficha.publicar"} <= set(acoes)
    assert acoes["ficha.editar"].entidade == "ficha" and acoes["ficha.editar"].entidade_id == ficha_id
    assert acoes["ficha.editar"].detalhes["ator"] == "admin"


def test_admin_exclui_ficha_alheia_e_duplica_mantendo_professor(client, db, admin_headers, ficha_id):
    dono = db.get(Ficha, ficha_id).professor_id
    nova = client.post(f"/ficha/{ficha_id}/duplicar", json={}, headers=admin_headers).json()
    assert db.get(Ficha, nova["id"]).professor_id == dono

    assert client.delete(f"/ficha/{ficha_id}", headers=admin_headers).status_code == 200
    assert db.query(Auditoria).filter(Auditoria.acao == "ficha.excluir").count() == 1


def test_auditoria_das_acoes_do_professor(client, db, professor_headers, ficha_id, treino_id, item_id):
    client.post(f"/ficha/item/{item_id}/duplicar", headers=professor_headers)
    client.put(f"/treino/{treino_id}/itens/ordem", json={"itens": [{"id": item_id, "ordem": 5}]},
               headers=professor_headers)
    client.delete(f"/treino/{treino_id}", headers=professor_headers)
    client.delete(f"/ficha/{ficha_id}", headers=professor_headers)

    acoes = {a.acao for a in db.query(Auditoria)}
    assert {"ficha.criar", "ficha.publicar", "treino.criar", "item.criar", "item.duplicar", "item.reordenar",
            "treino.excluir", "ficha.excluir"} <= acoes


def test_toda_escrita_atualiza_atualizado_em(client, db, professor_headers, ficha_id):
    ficha = db.get(Ficha, ficha_id)
    ficha.atualizado_em = datetime(2020, 1, 1)
    db.commit()

    _criar_treino(client, professor_headers, ficha_id)

    db.expire_all()
    assert db.get(Ficha, ficha_id).atualizado_em > datetime(2025, 1, 1)


def test_professor_nao_cria_ficha_para_aluno_nao_vinculado(client, db, outro_professor_headers, aluno_id):
    r = client.post("/ficha", json={"aluno_id": aluno_id, "nome": "Invasora"}, headers=outro_professor_headers)

    assert r.status_code == 404
    assert r.json()["detail"] == "Aluno não encontrado"
    assert db.query(Ficha).count() == 0


# ---------- treino sem dia e observação do item ----------

def test_treino_sem_dia_da_semana(client, professor_headers, ficha_id, aluno_headers):
    r = client.post("/treino", json={"ficha_id": ficha_id, "nome": "Treino A", "ordem": 1}, headers=professor_headers)

    assert r.status_code == 200
    assert r.json()["dia_semana"] is None
    treino_id = r.json()["id"]
    assert client.get(f"/treino/ficha/{ficha_id}", headers=professor_headers).json()[0]["dia_semana"] is None
    assert client.get(f"/ficha/{ficha_id}", headers=aluno_headers).json()["treinos"][0]["dia_semana"] is None
    # treino sem dia não aparece no "treino de hoje"
    assert client.get(f"/treino/hoje/{ficha_id}", headers=aluno_headers).json() == []
    # dá para definir e remover o dia depois
    r = client.put(f"/treino/{treino_id}", json={"nome": "A", "dia_semana": "segunda", "ordem": 1},
                   headers=professor_headers)
    assert r.json()["dia_semana"] == "segunda"
    r = client.put(f"/treino/{treino_id}", json={"nome": "A", "ordem": 1}, headers=professor_headers)
    assert r.json()["dia_semana"] is None


def test_observacao_do_item(client, professor_headers, aluno_headers, ficha_id, treino_id, exercicio_id):
    item_id = _criar_item(client, professor_headers, ficha_id, treino_id, exercicio_id, observacao="Pegada aberta")

    lista = client.get(f"/ficha/itens/treino/{treino_id}", headers=professor_headers).json()
    assert lista[0]["observacao"] == "Pegada aberta"
    assert client.get(f"/treino/hoje/{ficha_id}", headers=aluno_headers).json()[0]["itens"][0]["observacao"] == "Pegada aberta"
    assert client.get(f"/ficha/{ficha_id}", headers=aluno_headers).json()["treinos"][0]["itens"][0]["observacao"] == "Pegada aberta"
    assert client.get("/ficha/aluno", headers=aluno_headers).json()[0]["itens"][0]["observacao"] == "Pegada aberta"

    corpo = {"series": 3, "repeticoes": 10, "carga": 20, "descanso": 60, "ordem": 1}
    # PUT sem o campo mantém a observação; com null, limpa
    assert client.put(f"/ficha/item/{item_id}", json=corpo, headers=professor_headers).json()["observacao"] == "Pegada aberta"
    assert client.put(f"/ficha/item/{item_id}", json={**corpo, "observacao": None},
                      headers=professor_headers).json()["observacao"] is None
    longa = client.put(f"/ficha/item/{item_id}", json={**corpo, "observacao": "x" * 301}, headers=professor_headers)
    assert longa.status_code == 422


# ---------- exercícios ----------

def test_exercicio_grava_autor_e_instrucoes(client, db, professor_headers):
    r = client.post("/exercicios", headers=professor_headers,
                    json={"nome": "Agachamento", "descricao": "d", "grupo_muscular": "perna", "instrucoes": "Desça até 90°"})

    assert r.status_code == 200
    assert r.json()["instrucoes"] == "Desça até 90°"
    assert r.json()["criado_por_professor_id"] == db.query(Professor).filter(Professor.nome == "Professor").one().id
    # PUT sem instrucoes mantém; com valor altera
    base = {"nome": "Agachamento", "descricao": "d", "grupo_muscular": "perna"}
    assert client.put(f"/exercicios/{r.json()['id']}", json=base, headers=professor_headers).json()["instrucoes"] == "Desça até 90°"
    atualizado = client.put(f"/exercicios/{r.json()['id']}", json={**base, "instrucoes": "Nova"}, headers=professor_headers)
    assert atualizado.json()["instrucoes"] == "Nova"


def test_regras_de_edicao_e_exclusao_de_exercicio(
        client, db, professor_headers, outro_professor_headers, admin_headers):
    proprio = _criar_exercicio(client, professor_headers, "Do professor 1")
    biblioteca = _criar_exercicio(client, professor_headers, "Biblioteca")
    db.get(__import__("app.models", fromlist=["Exercicio"]).Exercicio, biblioteca).criado_por_professor_id = None
    db.commit()
    corpo = {"nome": "Editado", "descricao": "d", "grupo_muscular": "g"}

    # de outro professor: 403 em PUT, DELETE, imagem e vídeo
    for metodo, caminho, kwargs in [
        ("put", f"/exercicios/{proprio}", {"json": corpo}),
        ("delete", f"/exercicios/{proprio}", {}),
        ("put", f"/exercicios/{proprio}/imagem", {"files": {"arquivo": ("a.png", b"x", "image/png")}}),
        ("put", f"/exercicios/{proprio}/video", {"files": {"arquivo": ("a.mp4", b"x", "video/mp4")}}),
    ]:
        r = getattr(client, metodo)(caminho, headers=outro_professor_headers, **kwargs)
        assert r.status_code == 403, (metodo, caminho)
        assert r.json()["detail"] == "Exercício de outro professor"

    # biblioteca (sem autor): qualquer professor edita como hoje
    assert client.put(f"/exercicios/{biblioteca}", json=corpo, headers=outro_professor_headers).status_code == 200
    # o próprio e o admin editam/excluem
    assert client.put(f"/exercicios/{proprio}", json=corpo, headers=professor_headers).status_code == 200
    assert client.put(f"/exercicios/{proprio}", json={**corpo, "nome": "Admin"}, headers=admin_headers).status_code == 200
    assert client.delete(f"/exercicios/{proprio}", headers=admin_headers).status_code == 200
    assert client.delete(f"/exercicios/{biblioteca}", headers=outro_professor_headers).status_code == 200


def test_filtro_origem_dos_exercicios(client, db, professor_headers, outro_professor_headers, aluno_headers):
    from app.models import Exercicio

    meu = _criar_exercicio(client, professor_headers, "Meu")
    _criar_exercicio(client, outro_professor_headers, "Do outro")
    lib = _criar_exercicio(client, outro_professor_headers, "Biblioteca")
    db.get(Exercicio, lib).criado_por_professor_id = None
    db.commit()

    def ids(origem, headers=professor_headers):
        r = client.get(f"/exercicios?origem={origem}" if origem else "/exercicios", headers=headers)
        assert r.status_code == 200, r.text
        return sorted(i["id"] for i in r.json()["itens"])

    assert ids("meus") == [meu]
    assert ids("biblioteca") == [lib]
    assert len(ids(None)) == 3
    assert ids("meus", aluno_headers) == []
    assert client.get("/exercicios?origem=outra", headers=professor_headers).status_code == 422


# ---------- circunferências ----------

def test_circunferencias_opcionais_em_criar_editar_e_resposta(client, professor_headers, aluno_id, aluno_headers):
    base = {"data_avaliacao": "2026-03-01T08:00:00", "peso": 80, "altura": 1.8}

    sem = client.post(f"/alunos/{aluno_id}/avaliacoes", json=base, headers=professor_headers).json()
    assert all(sem[c] is None for c in CIRCUNFERENCIAS)

    valores = {c: 30.0 + i for i, c in enumerate(CIRCUNFERENCIAS)}
    r = client.post(f"/alunos/{aluno_id}/avaliacoes", json={**base, **valores}, headers=professor_headers)
    assert r.status_code == 200, r.text
    assert {c: r.json()[c] for c in CIRCUNFERENCIAS} == valores
    assert client.get("/avaliacoes", headers=aluno_headers).json()[0]["cintura"] is not None

    editada = client.put(f"/avaliacoes/{r.json()['id']}", json={**base, "cintura": 90.5}, headers=professor_headers)
    assert editada.json()["cintura"] == 90.5
    assert editada.json()["quadril"] is None


@pytest.mark.parametrize("campo", CIRCUNFERENCIAS)
@pytest.mark.parametrize("valor", [0, -1, 300.1])
def test_circunferencia_fora_da_faixa_422(client, professor_headers, aluno_id, campo, valor):
    corpo = {"data_avaliacao": "2026-03-01T08:00:00", "peso": 80, "altura": 1.8, campo: valor}

    assert client.post(f"/alunos/{aluno_id}/avaliacoes", json=corpo, headers=professor_headers).status_code == 422


def test_circunferencia_limite_300_aceito(client, professor_headers, aluno_id):
    corpo = {"data_avaliacao": "2026-03-01T08:00:00", "peso": 80, "altura": 1.8, "cintura": 300}

    assert client.post(f"/alunos/{aluno_id}/avaliacoes", json=corpo, headers=professor_headers).status_code == 200


def test_avaliacao_so_para_aluno_vinculado_e_admin_le(client, outro_professor_headers, admin_headers, professor_headers, aluno_id):
    corpo = {"data_avaliacao": "2026-03-01T08:00:00", "peso": 80, "altura": 1.8, "cintura": 80}

    assert client.post(f"/alunos/{aluno_id}/avaliacoes", json=corpo, headers=outro_professor_headers).status_code == 404
    client.post(f"/alunos/{aluno_id}/avaliacoes", json=corpo, headers=professor_headers)
    lida = client.get(f"/alunos/{aluno_id}/avaliacoes", headers=admin_headers)
    assert lida.status_code == 200 and lida.json()[0]["cintura"] == 80


# ---------- dashboard do professor ----------

def _aluno_extra(db, nome, professor="Professor", **campos):
    usuario = _criar_usuario(db, f"{nome.lower().replace(' ', '')}@teste.com", "aluno", nome)
    aluno_id = vincular(db, nome, professor)
    aluno = db.get(Aluno, aluno_id)
    for campo, valor in campos.items():
        setattr(aluno, campo, valor)
    db.commit()
    return usuario, aluno_id


def _avaliar(db, aluno_id, dias_atras):
    db.add(AvaliacaoFisica(aluno_id=aluno_id, data_avaliacao=agora_naive() - timedelta(days=dias_atras),
                           peso=80, altura=1.8))
    db.commit()


def _matricular(db, aluno_id, vencimento):
    plano = Plano(nome="Mensal", duracao_dias=30, valor=100, periodicidade="mensal")
    db.add(plano)
    db.flush()
    admin = db.query(User).filter(User.tipo == "admin").first()
    db.add(Matricula(aluno_id=aluno_id, plano_id=plano.id, data_inicio=vencimento - timedelta(days=29),
                     data_vencimento=vencimento, valor=100, status="ativa", criado_por_user_id=admin.id))
    db.commit()


def test_dashboard_do_professor_com_numeros_conferidos(client, db, professor_headers, admin_headers, aluno_id):
    hoje = agora_naive().date()
    agora = agora_naive()
    # A: o aluno do fixture — matrícula vigente, avaliado há 10 dias, vinculado há 3 dias
    db.get(Aluno, aluno_id).professor_vinculado_em = agora - timedelta(days=3)
    db.commit()
    _matricular(db, aluno_id, hoje + timedelta(days=10))
    _avaliar(db, aluno_id, 10)
    # B: sem matrícula, avaliado há 100 dias (> 90), vinculado há 1 dia
    _, b = _aluno_extra(db, "Aluno B", professor_vinculado_em=agora - timedelta(days=1))
    _avaliar(db, b, 100)
    # C: sem nenhuma avaliação, matrícula vencida, vinculado há 5 dias
    _, c = _aluno_extra(db, "Aluno C", professor_vinculado_em=agora - timedelta(days=5))
    _matricular(db, c, hoje - timedelta(days=1))
    # D: conta desativada — conta em total_alunos, mas não em ativos nem em avaliações pendentes
    usuario_d, d = _aluno_extra(db, "Aluno D", professor_vinculado_em=agora - timedelta(days=9))
    usuario_d.ativo = False
    db.commit()
    # E: de outro professor — não conta
    _criar_usuario(db, "profx@teste.com", "professor", "Professor X")
    _aluno_extra(db, "Aluno E", professor="Professor X")

    # fichas do professor: 1 recente, 1 antiga (> 60 dias), 1 com data_fim vencida, 1 rascunho, 1 excluída
    for nome in ("recente", "antiga", "vencida", "rascunho", "excluida"):
        _criar_ficha(client, professor_headers, aluno_id, nome=nome,
                     **({"status": "rascunho"} if nome == "rascunho" else {}))
    por_nome = {f.nome: f for f in db.query(Ficha)}
    por_nome["antiga"].atualizado_em = agora - timedelta(days=61)
    por_nome["vencida"].data_fim = hoje - timedelta(days=1)
    por_nome["vencida"].data_inicio = hoje - timedelta(days=30)
    por_nome["excluida"].ativo = False
    por_nome["excluida"].atualizado_em = agora - timedelta(days=200)
    db.commit()

    r = client.get("/professor/dashboard", headers=professor_headers)

    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["total_alunos"] == 4
    assert corpo["alunos_ativos"] == 1  # só A: conta ativa + aprovado + matrícula vigente
    assert corpo["avaliacoes_pendentes"] == 2  # B (100 dias) e C (nunca avaliado)
    assert corpo["fichas_ativas"] == 3
    assert corpo["fichas_rascunho"] == 1
    assert corpo["fichas_desatualizadas"] == 2  # antiga e vencida
    assert [a["nome"] for a in corpo["ultimos_alunos"]] == ["Aluno B", "Aluno", "Aluno C", "Aluno D"]
    # próximas avaliações: só alunos habilitados (A, B, C), mais urgentes primeiro
    proximas = corpo["proximas_avaliacoes"]
    assert [p["aluno"]["nome"] for p in proximas] == ["Aluno B", "Aluno C", "Aluno"]
    assert proximas[0]["ultima"] == (hoje - timedelta(days=100)).isoformat()
    assert proximas[0]["proxima"] == (hoje - timedelta(days=10)).isoformat()  # +90 dias
    assert proximas[1]["ultima"] is None and proximas[1]["proxima"] == hoje.isoformat()
    assert proximas[2]["proxima"] == (hoje - timedelta(days=10) + timedelta(days=90)).isoformat()


def test_dashboard_respeita_configuracao_de_dias(client, db, professor_headers, aluno_id):
    _avaliar(db, aluno_id, 40)
    assert client.get("/professor/dashboard", headers=professor_headers).json()["avaliacoes_pendentes"] == 0

    from app.services.configuracao import obter_configuracao
    obter_configuracao(db).dias_reavaliacao = 30
    db.commit()

    assert client.get("/professor/dashboard", headers=professor_headers).json()["avaliacoes_pendentes"] == 1


def test_dashboard_vazio_e_permissao(client, professor_headers, admin_headers, aluno_headers):
    corpo = client.get("/professor/dashboard", headers=professor_headers).json()

    assert corpo == {"total_alunos": 0, "alunos_ativos": 0, "avaliacoes_pendentes": 0, "fichas_ativas": 0,
                     "fichas_rascunho": 0, "fichas_desatualizadas": 0, "ultimos_alunos": [], "proximas_avaliacoes": []}
    assert client.get("/professor/dashboard", headers=admin_headers).status_code == 403
    assert client.get("/professor/dashboard", headers=aluno_headers).status_code == 403
    assert client.get("/professor/dashboard").status_code == 401


# ---------- frequência ----------

def _acesso(db, aluno_id, quando, resultado="liberado"):
    admin = db.query(User).filter(User.tipo == "admin").first()
    db.add(Acesso(aluno_id=aluno_id, data_hora=quando, resultado=resultado, motivos=[], registrado_por_user_id=admin.id))


def test_frequencia_conta_liberados_por_semana_e_ignora_bloqueados(client, db, professor_headers, admin_headers, aluno_id):
    agora = agora_naive().replace(hour=10, minute=0, second=0, microsecond=0)
    hoje = agora.date()
    segunda_atual = hoje - timedelta(days=hoje.weekday())
    segunda_anterior = segunda_atual - timedelta(days=7)
    # 2 entradas na semana atual, 1 na anterior, 1 bloqueada (não conta), 1 fora do período
    _acesso(db, aluno_id, datetime.combine(segunda_atual, agora.time()))
    _acesso(db, aluno_id, datetime.combine(segunda_atual, agora.time()) + timedelta(hours=2))
    _acesso(db, aluno_id, datetime.combine(segunda_anterior, agora.time()))
    _acesso(db, aluno_id, datetime.combine(segunda_anterior, agora.time()), resultado="bloqueado")
    _acesso(db, aluno_id, agora - timedelta(days=400))
    db.commit()

    r = client.get(f"/alunos/{aluno_id}/frequencia?meses=6", headers=professor_headers)

    assert r.status_code == 200, r.text
    corpo = r.json()
    semanas = {s["semana_inicio"]: s["total"] for s in corpo["entradas_por_semana"]}
    assert semanas[segunda_atual.isoformat()] == 2
    assert semanas[segunda_anterior.isoformat()] == 1
    assert sum(semanas.values()) == 3 == corpo["total_periodo"]
    # semanas sem entrada aparecem com zero, em ordem crescente
    chaves = [s["semana_inicio"] for s in corpo["entradas_por_semana"]]
    assert chaves == sorted(chaves) and chaves[-1] == segunda_atual.isoformat()
    assert len(chaves) >= 26
    # a última entrada é a da segunda da semana atual (+2 h), qualquer que seja o dia em que a suíte rode
    ultima = datetime.combine(segunda_atual, agora.time()) + timedelta(hours=2)
    assert corpo["ultima_entrada"].startswith(ultima.strftime("%Y-%m-%dT%H:%M"))
    assert corpo["sessoes_treino_periodo"] == 0
    # admin acessa igual; período menor exclui o que ficou de fora
    assert client.get(f"/alunos/{aluno_id}/frequencia", headers=admin_headers).json()["total_periodo"] == 3


def test_frequencia_conta_sessoes_de_treino_finalizadas(client, db, professor_headers, aluno_id, treino_id):
    agora = agora_naive()
    db.add(SessaoTreino(aluno_id=aluno_id, treino_id=treino_id, iniciada_em=agora - timedelta(days=2),
                        finalizada_em=agora - timedelta(days=2, hours=-1)))
    db.add(SessaoTreino(aluno_id=aluno_id, treino_id=treino_id, iniciada_em=agora - timedelta(days=1)))  # aberta
    db.commit()

    corpo = client.get(f"/alunos/{aluno_id}/frequencia", headers=professor_headers).json()

    assert corpo["sessoes_treino_periodo"] == 1
    assert corpo["total_periodo"] == 0 and corpo["ultima_entrada"] is None


def test_frequencia_janela_em_meses(client, db, professor_headers, aluno_id):
    agora = agora_naive()
    _acesso(db, aluno_id, agora - timedelta(days=10))
    _acesso(db, aluno_id, agora - timedelta(days=100))
    db.commit()

    assert client.get(f"/alunos/{aluno_id}/frequencia?meses=1", headers=professor_headers).json()["total_periodo"] == 1
    assert client.get(f"/alunos/{aluno_id}/frequencia?meses=6", headers=professor_headers).json()["total_periodo"] == 2
    assert client.get(f"/alunos/{aluno_id}/frequencia?meses=0", headers=professor_headers).status_code == 422
    assert client.get(f"/alunos/{aluno_id}/frequencia?meses=25", headers=professor_headers).status_code == 422


def test_frequencia_escopo_do_professor(client, outro_professor_headers, aluno_headers, aluno_id):
    r = client.get(f"/alunos/{aluno_id}/frequencia", headers=outro_professor_headers)

    assert r.status_code == 404 and r.json()["detail"] == "Aluno não encontrado"
    assert client.get(f"/alunos/{aluno_id}/frequencia", headers=aluno_headers).status_code == 403


def test_frequencia_gestao_para_admin_e_recepcao(client, db, admin_headers, professor_headers, aluno_id):
    _acesso(db, aluno_id, agora_naive())
    db.commit()
    recepcao = _headers(_criar_usuario(db, "recep@teste.com", "recepcao", "Recepção"))

    for headers in (admin_headers, recepcao):
        r = client.get(f"/gestao/alunos/{aluno_id}/frequencia", headers=headers)
        assert r.status_code == 200, r.text
        assert r.json()["total_periodo"] == 1
    assert client.get("/gestao/alunos/9999/frequencia", headers=admin_headers).status_code == 404
    assert client.get(f"/gestao/alunos/{aluno_id}/frequencia", headers=professor_headers).status_code == 403
