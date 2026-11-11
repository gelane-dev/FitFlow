"""GA-05-fix: correções da revisão (GB-01, GB-02, GB-03/04, GB-07, GB-08, GB-09, ADR-038)."""
import os
import subprocess
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

import pytest
from jose import jwt
from sqlalchemy import event, select
from sqlalchemy.orm import Session

from app.core.seguranca import ALGORITHM
from app.core.tempo import agora
from app.core.validacao import normalizar_cpf
from app.models import Acesso, Aluno, Auditoria, Ficha, FichaVersao, Matricula, Professor, User
from app.services import equipe as servico_equipe
from app.services import gestao_alunos as servico_gestao
from app.services import matriculas as servico_matriculas
from app.services.acessos import avaliar_acesso
from conftest import engine_teste
from gestao_fabrica import (
    TODAS_PERMISSOES, criar_aluno, criar_matricula, criar_pagamento, criar_plano, criar_recepcao, dias, headers,
)

RAIZ_BACKEND = Path(__file__).resolve().parents[1]


def _corpo_avaliacao():
    return {"data_avaliacao": agora().isoformat(), "peso": 80, "altura": 1.8}


def _professor_id(db, nome):
    return db.query(Professor).filter(Professor.nome == nome).one().id


# ---------- GB-01: GET /sessoes/{id} com escopo do professor ----------

def _abrir_sessao(client, aluno_headers, treino_id):
    return client.post("/sessoes", json={"treino_id": treino_id}, headers=aluno_headers).json()["id"]


def test_sessao_visivel_so_para_professor_vinculado(
    client, professor_headers, outro_professor_headers, aluno_headers, aluno_id, treino_id, item_id,
):
    sessao_id = _abrir_sessao(client, aluno_headers, treino_id)

    assert client.get(f"/sessoes/{sessao_id}", headers=professor_headers).status_code == 200
    assert client.get(f"/sessoes/{sessao_id}", headers=aluno_headers).status_code == 200

    r = client.get(f"/sessoes/{sessao_id}", headers=outro_professor_headers)
    assert r.status_code == 404 and r.json()["detail"] == "Sessão não encontrada"


def test_sessao_de_aluno_sem_professor_e_404_para_qualquer_professor(
    client, db, professor_headers, aluno_headers, aluno_id, treino_id, item_id,
):
    sessao_id = _abrir_sessao(client, aluno_headers, treino_id)
    db.query(Aluno).filter(Aluno.id == aluno_id).one().professor_id = None
    db.commit()

    assert client.get(f"/sessoes/{sessao_id}", headers=professor_headers).status_code == 404


# ---------- GB-02 + ADR-038: aluno vinculado e fichas acompanham a troca ----------

def test_troca_de_professor_leva_as_fichas_e_corta_o_acesso_do_antigo(
    client, db, admin_headers, professor_headers, outro_professor_headers, aluno_id, ficha_id, treino_id, item_id,
):
    novo = _professor_id(db, "Professor 2")
    antigo = _professor_id(db, "Professor")
    assert client.get(f"/ficha/{ficha_id}/completa", headers=professor_headers).status_code == 200

    r = client.put(f"/admin/alunos/{aluno_id}/professor", json={"professor_id": novo}, headers=admin_headers)
    assert r.status_code == 200

    db.expire_all()
    assert db.get(Ficha, ficha_id).professor_id == novo
    # professor antigo: 403 com as mensagens existentes
    assert client.get(f"/ficha/{ficha_id}/completa", headers=professor_headers).status_code == 403
    assert client.get(f"/ficha/{ficha_id}/versoes", headers=professor_headers).status_code == 403
    assert client.put(f"/treino/{treino_id}", headers=professor_headers,
                      json={"nome": "X", "ordem": 1}).status_code == 403
    assert client.put(f"/ficha/item/{item_id}", headers=professor_headers, json={"series": 4, "repeticoes": 10, "carga": 20.0, "descanso": 60, "ordem": 1}).status_code == 403
    # professor novo: assume
    assert client.get(f"/ficha/{ficha_id}/completa", headers=outro_professor_headers).status_code == 200
    assert client.get(f"/ficha/{ficha_id}/versoes", headers=outro_professor_headers).status_code == 200

    registro = db.query(Auditoria).filter(Auditoria.acao == "aluno.trocar_professor").one()
    assert registro.detalhes == {
        "professor_anterior_id": antigo, "professor_id": novo, "fichas_transferidas": [ficha_id]}


def test_aluno_sem_professor_so_o_admin_gerencia_a_ficha(
    client, db, admin_headers, professor_headers, aluno_id, ficha_id,
):
    r = client.put(f"/admin/alunos/{aluno_id}/professor", json={"professor_id": None}, headers=admin_headers)
    assert r.status_code == 200

    db.expire_all()
    assert db.get(Ficha, ficha_id).professor_id == _professor_id(db, "Professor")  # a ficha não muda de dono
    assert client.get(f"/ficha/{ficha_id}/completa", headers=professor_headers).status_code == 403
    assert client.get(f"/ficha/{ficha_id}/completa", headers=admin_headers).status_code == 200


def test_transferir_alunos_move_as_fichas_ativas_com_auditoria(
    client, db, admin_headers, professor_headers, outro_professor_headers, aluno_id, ficha_id,
):
    antigo = _professor_id(db, "Professor")
    novo = _professor_id(db, "Professor 2")
    inativa = client.post("/ficha", json={"aluno_id": aluno_id, "nome": "Velha"}, headers=professor_headers).json()["id"]
    assert client.delete(f"/ficha/{inativa}", headers=professor_headers).status_code == 200

    r = client.post(f"/admin/professores/{antigo}/transferir-alunos",
                    json={"destino_professor_id": novo}, headers=admin_headers)
    assert r.status_code == 200 and r.json() == {"transferidos": 1}

    db.expire_all()
    assert db.get(Ficha, ficha_id).professor_id == novo
    assert db.get(Ficha, inativa).professor_id == antigo  # exclusão lógica: o histórico fica com o autor
    assert client.get(f"/ficha/{ficha_id}/completa", headers=professor_headers).status_code == 403
    assert client.get(f"/ficha/{ficha_id}/completa", headers=outro_professor_headers).status_code == 200

    registro = db.query(Auditoria).filter(Auditoria.acao == "professor.transferir_alunos").one()
    assert registro.detalhes == {
        "origem_professor_id": antigo, "destino_professor_id": novo,
        "aluno_ids": [aluno_id], "fichas_transferidas": [ficha_id]}


def test_avaliacao_exige_aluno_vinculado(
    client, db, admin_headers, professor_headers, outro_professor_headers, aluno_id,
):
    r = client.post(f"/alunos/{aluno_id}/avaliacoes", json=_corpo_avaliacao(), headers=professor_headers)
    assert r.status_code == 200
    avaliacao_id = r.json()["id"]
    novo = _professor_id(db, "Professor 2")

    client.put(f"/admin/alunos/{aluno_id}/professor", json={"professor_id": novo}, headers=admin_headers)

    r = client.put(f"/avaliacoes/{avaliacao_id}", json=_corpo_avaliacao(), headers=professor_headers)
    assert r.status_code == 403 and r.json()["detail"] == "Você não tem permissão para alterar esta avaliação"
    r = client.delete(f"/avaliacoes/{avaliacao_id}", headers=professor_headers)
    assert r.status_code == 403 and r.json()["detail"] == "Você não tem permissão para excluir esta avaliação"
    # o professor novo lê as avaliações do aluno, mas a autoria continua sendo do antigo
    assert len(client.get(f"/alunos/{aluno_id}/avaliacoes", headers=outro_professor_headers).json()) == 1
    r = client.put(f"/avaliacoes/{avaliacao_id}", json=_corpo_avaliacao(), headers=outro_professor_headers)
    assert r.status_code == 403


# ---------- GB-03/GB-04: regra única de matrícula ----------

def test_vencida_alem_da_tolerancia(db):
    aluno = criar_aluno(db, "Tol")
    matricula = criar_matricula(db, aluno, criar_plano(db), inicio=dias(-40))
    matricula.data_vencimento = dias(-3)
    referencia = dias(0)

    assert servico_matriculas.dias_de_atraso(matricula, referencia) == 3
    assert servico_matriculas.vencida_alem_da_tolerancia(matricula, referencia, 2) is True
    assert servico_matriculas.vencida_alem_da_tolerancia(matricula, referencia, 3) is False
    assert servico_matriculas.vencida_alem_da_tolerancia(matricula, referencia, 5) is False


def test_acesso_usa_a_regra_unica_de_tolerancia(db):
    aluno = criar_aluno(db, "Acesso")
    matricula = criar_matricula(db, aluno, criar_plano(db), inicio=dias(-40))
    matricula.data_vencimento = dias(-1)
    db.commit()

    assert avaliar_acesso(db, aluno)["motivos"] == ["matricula_vencida"]  # tolerância padrão 0


@pytest.mark.parametrize("situacao", ["vigente", "vencendo", "vencida"])
def test_filtro_de_matricula_equivale_a_calcular_situacao(db, situacao):
    plano = criar_plano(db)
    referencia = dias(0)
    matriculas = []
    for i, vence_em in enumerate([-5, -1, 0, 3, 7, 8, 30]):
        matricula = criar_matricula(db, criar_aluno(db, f"A{i}"), plano)
        matricula.data_vencimento = referencia + timedelta(days=vence_em)
        matriculas.append(matricula)
    cancelada = criar_matricula(db, criar_aluno(db, "Canc"), plano, status="cancelada")
    cancelada.data_vencimento = referencia + timedelta(days=3)
    db.commit()

    achadas = set(db.scalars(
        select(Matricula.id).where(servico_matriculas.filtro_situacao_matricula(situacao, referencia, 7))).all())
    esperadas = {m.id for m in matriculas if servico_matriculas.calcular_situacao(m, referencia, 7) == situacao}

    assert achadas == esperadas and cancelada.id not in achadas


def test_painel_do_professor_conta_ativos_pela_condicao_unica(client, db, professor_headers, aluno_id):
    aluno = db.get(Aluno, aluno_id)
    assert client.get("/professor/dashboard", headers=professor_headers).json()["alunos_ativos"] == 0

    criar_matricula(db, aluno, criar_plano(db), inicio=dias(-5))
    assert client.get("/professor/dashboard", headers=professor_headers).json()["alunos_ativos"] == 1

    aluno.user.ativo = False
    db.commit()
    assert client.get("/professor/dashboard", headers=professor_headers).json()["alunos_ativos"] == 0


# ---------- GB-07: corridas viram 400; travas de linha ----------

NOVO_ALUNO = {
    "email": "corrida@gestao.com", "senha": "senha123", "nome": "Corrida", "telefone": "11999990000",
    "data_nascimento": "2001-02-03", "cpf": "529.982.247-25",
}


@pytest.fixture
def recepcao(db):
    usuario, _ = criar_recepcao(db, TODAS_PERMISSOES)
    return headers(usuario)


def test_corrida_de_email_e_cpf_vira_400(client, db, recepcao, monkeypatch):
    assert client.post("/gestao/alunos", json=NOVO_ALUNO, headers=recepcao).status_code == 200
    # simula a corrida: a checagem prévia não enxerga o registro que outro pedido acabou de gravar
    monkeypatch.setattr(servico_gestao, "exigir_email_livre", lambda *a, **k: None)
    monkeypatch.setattr(servico_gestao, "_exigir_cpf_livre", lambda *a, **k: None)

    r = client.post("/gestao/alunos", json=NOVO_ALUNO, headers=recepcao)
    assert r.status_code == 400 and r.json()["detail"] == "E-mail já cadastrado"

    r = client.post("/gestao/alunos", json={**NOVO_ALUNO, "email": "outro@gestao.com"}, headers=recepcao)
    assert r.status_code == 400 and r.json()["detail"] == "CPF já cadastrado"


def test_corrida_de_cpf_na_edicao_e_de_email_na_equipe_vira_400(client, db, recepcao, admin_headers, monkeypatch):
    criar_aluno(db, "Primeiro", cpf="52998224725")
    segundo = criar_aluno(db, "Segundo", cpf="11144477735")
    monkeypatch.setattr(servico_gestao, "_exigir_cpf_livre", lambda *a, **k: None)
    r = client.put(f"/gestao/alunos/{segundo.id}", headers=recepcao, json={
        "nome": "Segundo", "telefone": "1", "data_nascimento": "1990-01-01", "cpf": "529.982.247-25"})
    assert r.status_code == 400 and r.json()["detail"] == "CPF já cadastrado"

    monkeypatch.setattr(servico_equipe, "exigir_email_livre", lambda *a, **k: None)
    corpo = {"email": "rec@gestao.com", "senha": "senha123", "nome": "Rec", "telefone": "1"}
    assert client.post("/admin/recepcionistas", json=corpo, headers=admin_headers).status_code == 200
    r = client.post("/admin/recepcionistas", json=corpo, headers=admin_headers)
    assert r.status_code == 400 and r.json()["detail"] == "E-mail já cadastrado"


def test_corrida_de_email_ao_criar_professor_vira_400(client, db, admin_headers, monkeypatch):
    from app.routers import admin as router_admin

    prof = {"email": "prof@gestao.com", "senha": "senha123", "nome": "Prof", "telefone": "1"}
    assert client.post("/admin/professores", json=prof, headers=admin_headers).status_code == 200
    # o professor já existe; sem a checagem prévia, só a constraint única segura a duplicata
    monkeypatch.setattr(router_admin, "select", lambda *a, **k: select(User).where(User.id == -1))
    r = client.post("/admin/professores", json=prof, headers=admin_headers)
    assert r.status_code == 400 and r.json()["detail"] == "E-mail já cadastrado"


def test_leituras_criticas_pedem_trava_de_linha(client, db, recepcao, monkeypatch):
    pedidos = []
    original = Session.get

    def espiao(self, entidade, ident, **kw):
        pedidos.append((entidade.__name__, kw.get("with_for_update")))
        return original(self, entidade, ident, **kw)

    monkeypatch.setattr(Session, "get", espiao)
    aluno = criar_aluno(db, "Trava")
    pagamento = criar_pagamento(db, aluno, "10.00")
    matricula = criar_matricula(db, aluno, criar_plano(db))

    r = client.post(f"/pagamentos/{pagamento.id}/registrar", json={"forma": "pix"}, headers=recepcao)
    assert r.status_code == 200
    r = client.post(f"/pagamentos/{pagamento.id}/estornar", json={"motivo": "erro"}, headers=recepcao)
    assert r.status_code == 200
    r = client.post(f"/matriculas/{matricula.id}/cancelar", json={"motivo": "x"}, headers=recepcao)
    assert r.status_code == 200

    travados = [nome for nome, trava in pedidos if trava]
    assert travados.count("Pagamento") == 2 and travados.count("Matricula") == 1


def test_publicar_numera_as_versoes_em_sequencia(client, db, professor_headers, ficha_id):
    for _ in range(3):
        assert client.post(f"/ficha/{ficha_id}/publicar", headers=professor_headers).status_code == 200
    numeros = [v.numero for v in db.query(FichaVersao).filter(FichaVersao.ficha_id == ficha_id).all()]
    assert sorted(numeros) == [1, 2, 3, 4]  # 1 = criação (publicada por padrão)


# ---------- GB-08 ----------

def _importar_config(**env):
    ambiente = {**os.environ, "DATABASE_URL": "sqlite://", "SECRET_KEY": "x", **env}
    return subprocess.run(
        [sys.executable, "-c", "import app.core.config"], cwd=RAIZ_BACKEND, env=ambiente,
        capture_output=True, text=True)


def test_samesite_none_sem_secure_falha_na_inicializacao():
    r = _importar_config(COOKIE_SAMESITE="none", COOKIE_SECURE="false")
    assert r.returncode != 0 and "COOKIE_SAMESITE=none exige COOKIE_SECURE=true" in r.stderr

    assert _importar_config(COOKIE_SAMESITE="none", COOKIE_SECURE="true").returncode == 0
    assert _importar_config(COOKIE_SAMESITE="lax").returncode == 0


def test_normalizar_cpf():
    assert normalizar_cpf("529.982.247-25") == "52998224725"
    assert normalizar_cpf("52998224725") == "52998224725"
    assert normalizar_cpf("  ") is None and normalizar_cpf(None) is None
    for invalido in ("123.456.789-00", "11111111111", "123", "529.982.247-26", "abcdefghijk"):
        with pytest.raises(ValueError, match="CPF inválido"):
            normalizar_cpf(invalido)


def test_cpf_normalizado_e_duplicidade_pela_forma_normal(client, db, recepcao):
    r = client.post("/gestao/alunos", json=NOVO_ALUNO, headers=recepcao)
    assert r.status_code == 200 and r.json()["cpf"] == "52998224725"

    r = client.post("/gestao/alunos", json={**NOVO_ALUNO, "email": "b@gestao.com", "cpf": "52998224725"}, headers=recepcao)
    assert r.status_code == 400 and r.json()["detail"] == "CPF já cadastrado"

    r = client.post("/gestao/alunos", json={**NOVO_ALUNO, "email": "c@gestao.com", "cpf": "123.456.789-00"}, headers=recepcao)
    assert r.status_code == 422 and "CPF inválido" in r.text


def test_pago_em_futuro_422(client, db, recepcao):
    pagamento = criar_pagamento(db, criar_aluno(db, "Futuro"), "10.00")
    url = f"/pagamentos/{pagamento.id}/registrar"

    amanha = (datetime.now() + timedelta(days=1)).isoformat()
    r = client.post(url, json={"forma": "pix", "pago_em": amanha}, headers=recepcao)
    assert r.status_code == 422 and "Data do pagamento não pode ser futura" in r.text

    ontem = (datetime.now() - timedelta(days=1)).isoformat()
    assert client.post(url, json={"forma": "pix", "pago_em": ontem}, headers=recepcao).status_code == 200


def test_sub_invalido_no_token_401(client):
    def token(payload):
        return jwt.encode({**payload, "exp": datetime.utcnow() + timedelta(minutes=5)}, "chave-de-teste", algorithm=ALGORITHM)

    for payload in ({"sub": "abc"}, {"sub": ""}, {}):
        r = client.get("/perfil", headers={"Authorization": f"Bearer {token(payload)}"})
        assert r.status_code == 401 and r.json()["detail"] == "Token inválido ou expirado"


# ---------- GB-09 ----------

def test_versoes_trazem_autores_em_lote(client, db, admin_headers, professor_headers, ficha_id):
    client.post(f"/ficha/{ficha_id}/publicar", headers=professor_headers)
    client.post(f"/ficha/{ficha_id}/publicar", headers=admin_headers)

    consultas = []

    def contar(conexao, cursor, statement, *a):
        consultas.append(statement)

    event.listen(engine_teste, "before_cursor_execute", contar)
    try:
        r = client.get(f"/ficha/{ficha_id}/versoes", headers=professor_headers)
    finally:
        event.remove(engine_teste, "before_cursor_execute", contar)

    assert r.status_code == 200
    autores = {v["numero"]: v["publicada_por"] for v in r.json()}
    assert autores[1]["nome"] == "Professor" and autores[1]["tipo"] == "professor"
    assert autores[3]["tipo"] == "admin" and autores[3]["nome"] == "admin@teste.com"
    # autenticação usa consultas por id; os autores vêm de duas consultas com IN, não de uma por versão
    assert len([c for c in consultas if ("FROM users" in c or "FROM professores" in c) and " IN (" in c]) == 2


def test_listar_acessos_traz_motivos_detalhados(client, db, recepcao):
    aluno = criar_aluno(db, "Detalhe", restricao="Débito antigo")
    criar_matricula(db, aluno, criar_plano(db), inicio=dias(-40)).data_vencimento = dias(-2)
    db.add(Acesso(aluno_id=aluno.id, data_hora=datetime.now(), resultado="bloqueado",
                  motivos=["restricao", "matricula_vencida"], origem="manual",
                  registrado_por_user_id=aluno.user_id))
    db.commit()

    lista = client.get("/acessos", headers=recepcao).json()["itens"]
    mensagens = [m["mensagem"] for m in lista[0]["motivos"]]
    assert mensagens == ["Restrição: Débito antigo", f"Matrícula vencida em {dias(-2).strftime('%d/%m/%Y')}"]

    historico = client.get(f"/gestao/alunos/{aluno.id}/acessos", headers=recepcao).json()["itens"]
    assert [m["mensagem"] for m in historico[0]["motivos"]] == mensagens
