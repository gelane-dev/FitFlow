"""Migração b7c8d9e0f1a2 (GA-01) executada em SQLite sobre o schema de a6b7c8d9e0f1.

A cadeia completa só roda em PostgreSQL (test_migracoes.py, com TEST_POSTGRES_URL); aqui o
schema "antigo" é montado à mão e só a revisão nova é aplicada, o que dispensa servidor.
"""
import importlib.util
from pathlib import Path

import pytest
from alembic.config import Config
from alembic.operations import Operations
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError

BACKEND = Path(__file__).resolve().parent.parent
ARQUIVO = BACKEND / "alembic" / "versions" / "b7c8d9e0f1a2_gestao_da_academia.py"

SCHEMA_ANTIGO = """
CREATE TABLE users (id INTEGER PRIMARY KEY, email VARCHAR(150) NOT NULL UNIQUE, senha VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL, foto VARCHAR(255), foto_public_id VARCHAR(255));
CREATE TABLE professores (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    nome VARCHAR(150) NOT NULL, telefone VARCHAR(20) NOT NULL);
CREATE TABLE alunos (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    nome VARCHAR(150) NOT NULL, data_nascimento DATE NOT NULL, telefone VARCHAR(20) NOT NULL);
CREATE TABLE exercicios (id INTEGER PRIMARY KEY, nome VARCHAR(150) NOT NULL, descricao VARCHAR(500) NOT NULL,
    grupo_muscular VARCHAR(150) NOT NULL, imagem VARCHAR(500), imagem_public_id VARCHAR(500),
    video VARCHAR(500), video_public_id VARCHAR(500), ativo BOOLEAN NOT NULL);
CREATE TABLE fichas (id INTEGER PRIMARY KEY, aluno_id INTEGER NOT NULL REFERENCES alunos(id),
    professor_id INTEGER NOT NULL REFERENCES professores(id), nome VARCHAR(150) NOT NULL,
    data_criacao DATETIME NOT NULL, data_inicio DATE, data_fim DATE, ativo BOOLEAN NOT NULL);
CREATE TABLE treino (id INTEGER PRIMARY KEY, ficha_id INTEGER NOT NULL REFERENCES fichas(id),
    nome VARCHAR(150) NOT NULL, dia_semana VARCHAR(20) NOT NULL, ordem INTEGER NOT NULL, ativo BOOLEAN NOT NULL);
CREATE TABLE itens_ficha (id INTEGER PRIMARY KEY, ficha_id INTEGER NOT NULL REFERENCES fichas(id),
    exercicio_id INTEGER NOT NULL REFERENCES exercicios(id), series INTEGER NOT NULL, repeticoes INTEGER NOT NULL,
    carga FLOAT NOT NULL, descanso INTEGER NOT NULL, ativo BOOLEAN NOT NULL,
    treino_id INTEGER NOT NULL REFERENCES treino(id), ordem INTEGER NOT NULL);
CREATE TABLE avaliacoes_fisicas (id INTEGER PRIMARY KEY, aluno_id INTEGER NOT NULL REFERENCES alunos(id),
    data_avaliacao DATETIME NOT NULL, peso FLOAT NOT NULL, altura FLOAT NOT NULL, percentual_gordura FLOAT,
    massa_muscular FLOAT, observacao VARCHAR(500), professor_id INTEGER REFERENCES professores(id));
"""

DADOS = """
INSERT INTO users (id, email, senha, tipo) VALUES (1, 'p1@x.com', 'h', 'professor'), (2, 'p2@x.com', 'h', 'professor'),
    (3, 'a1@x.com', 'h', 'aluno'), (4, 'a2@x.com', 'h', 'aluno'), (5, 'a3@x.com', 'h', 'aluno');
INSERT INTO professores (id, user_id, nome, telefone) VALUES (10, 1, 'Prof Um', '1'), (20, 2, 'Prof Dois', '2');
INSERT INTO alunos (id, user_id, nome, data_nascimento, telefone) VALUES
    (100, 3, 'Com Duas Fichas', '2000-01-01', '1'), (200, 4, 'So Ficha Inativa', '2000-01-01', '2'),
    (300, 5, 'Sem Ficha', '2000-01-01', '3');
INSERT INTO exercicios (id, nome, descricao, grupo_muscular, ativo) VALUES (1, 'Supino', 'd', 'peito', 1);
INSERT INTO fichas (id, aluno_id, professor_id, nome, data_criacao, ativo) VALUES
    (1, 100, 10, 'Antiga', '2026-01-01 10:00:00', 1),
    (2, 100, 20, 'Recente', '2026-06-01 10:00:00', 1),
    (3, 100, 10, 'Mais nova mas inativa', '2026-09-01 10:00:00', 0),
    (4, 200, 10, 'Inativa', '2026-03-01 10:00:00', 0);
INSERT INTO treino (id, ficha_id, nome, dia_semana, ordem, ativo) VALUES (1, 2, 'A', 'quarta', 1, 1);
INSERT INTO itens_ficha (id, ficha_id, exercicio_id, series, repeticoes, carga, descanso, ativo, treino_id, ordem)
    VALUES (1, 2, 1, 3, 10, 20.0, 60, 1, 1, 1);
INSERT INTO avaliacoes_fisicas (id, aluno_id, data_avaliacao, peso, altura, professor_id)
    VALUES (1, 100, '2026-05-01 09:00:00', 70.5, 1.75, 10);
"""

CIRCUNFERENCIAS = {
    'cintura', 'quadril', 'abdomen', 'peito', 'braco_direito', 'braco_esquerdo',
    'coxa_direita', 'coxa_esquerda', 'panturrilha',
}
TABELAS_NOVAS = {
    'recepcionistas', 'configuracao_academia', 'planos', 'matriculas', 'pagamentos', 'acessos',
    'auditoria', 'fichas_versoes',
}


def _carregar_migracao():
    spec = importlib.util.spec_from_file_location("migracao_gestao", ARQUIVO)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def _executar(engine, funcao):
    with engine.begin() as conexao:
        contexto = MigrationContext.configure(conexao)
        with Operations.context(contexto):
            funcao()


@pytest.fixture
def engine():
    engine = create_engine("sqlite://")
    with engine.begin() as conexao:
        for comando in SCHEMA_ANTIGO.strip().split(";\n"):
            if comando.strip():
                conexao.execute(text(comando))
        for comando in DADOS.strip().split(";\n"):
            if comando.strip():
                conexao.execute(text(comando))
    yield engine
    engine.dispose()


def _colunas(engine, tabela):
    return {c["name"] for c in inspect(engine).get_columns(tabela)}


def _escalar(engine, sql):
    with engine.connect() as conexao:
        return conexao.execute(text(sql)).scalar()


def test_migracao_encadeia_em_a6b7c8d9e0f1_e_e_a_unica_head():
    config = Config(str(BACKEND / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND / "alembic"))
    script = ScriptDirectory.from_config(config)

    assert script.get_heads() == ["b7c8d9e0f1a2"]
    assert script.get_revision("b7c8d9e0f1a2").down_revision == "a6b7c8d9e0f1"


def test_upgrade_adiciona_colunas_tabelas_e_preserva_dados(engine):
    _executar(engine, _carregar_migracao().upgrade)
    inspetor = inspect(engine)

    assert {"ativo", "criado_em"} <= _colunas(engine, "users")
    assert {"status_cadastro", "professor_id", "professor_vinculado_em", "cpf", "endereco", "observacoes",
            "restricao_acesso", "codigo_acesso", "aprovado_em", "aprovado_por_user_id"} <= _colunas(engine, "alunos")
    assert {"objetivo", "status", "atualizado_em"} <= _colunas(engine, "fichas")
    assert "observacao" in _colunas(engine, "itens_ficha")
    assert {"instrucoes", "criado_por_professor_id"} <= _colunas(engine, "exercicios")
    assert CIRCUNFERENCIAS <= _colunas(engine, "avaliacoes_fisicas")
    assert TABELAS_NOVAS <= set(inspetor.get_table_names())

    # dados antigos intactos, com os padrões do contrato
    assert _escalar(engine, "SELECT COUNT(*) FROM users") == 5
    assert _escalar(engine, "SELECT COUNT(*) FROM users WHERE ativo = 1 AND criado_em IS NULL") == 5
    assert _escalar(engine, "SELECT COUNT(*) FROM alunos WHERE status_cadastro = 'aprovado'") == 3
    assert _escalar(engine, "SELECT COUNT(*) FROM fichas WHERE status = 'publicada' AND objetivo IS NULL") == 4
    assert _escalar(engine, "SELECT nome FROM alunos WHERE id = 100") == "Com Duas Fichas"
    assert _escalar(engine, "SELECT peso FROM avaliacoes_fisicas WHERE id = 1") == 70.5
    assert _escalar(engine, "SELECT dia_semana FROM treino WHERE id = 1") == "quarta"
    assert _escalar(engine, "SELECT carga FROM itens_ficha WHERE id = 1") == 20.0


def test_upgrade_vincula_professor_da_ficha_ativa_mais_recente(engine):
    _executar(engine, _carregar_migracao().upgrade)

    # 100: fichas ativas 1 (prof 10, jan) e 2 (prof 20, jun); a 3 é mais nova mas inativa
    assert _escalar(engine, "SELECT professor_id FROM alunos WHERE id = 100") == 20
    assert _escalar(engine, "SELECT professor_id FROM alunos WHERE id = 200") is None
    assert _escalar(engine, "SELECT professor_id FROM alunos WHERE id = 300") is None
    assert _escalar(engine, "SELECT COUNT(*) FROM alunos WHERE professor_vinculado_em IS NOT NULL") == 0


def test_upgrade_gera_codigo_de_acesso_unico_por_aluno(engine):
    _executar(engine, _carregar_migracao().upgrade)

    with engine.connect() as conexao:
        codigos = [linha[0] for linha in conexao.execute(text("SELECT codigo_acesso FROM alunos"))]

    assert len(codigos) == 3
    assert all(c and len(c) == 16 for c in codigos)
    assert len(set(codigos)) == 3


def test_upgrade_copia_data_criacao_para_atualizado_em(engine):
    _executar(engine, _carregar_migracao().upgrade)

    with engine.connect() as conexao:
        linhas = conexao.execute(text("SELECT data_criacao, atualizado_em FROM fichas")).fetchall()

    assert len(linhas) == 4
    assert all(criacao == atualizado for criacao, atualizado in linhas)


def test_upgrade_cria_a_linha_unica_de_configuracao(engine):
    _executar(engine, _carregar_migracao().upgrade)

    with engine.connect() as conexao:
        linha = conexao.execute(text("SELECT * FROM configuracao_academia")).mappings().all()

    assert len(linha) == 1
    assert linha[0]["id"] == 1
    assert linha[0]["nome"] == "FitFlow"
    assert linha[0]["horarios"] == "[]"
    assert (linha[0]["tolerancia_dias_vencimento"], linha[0]["dias_alerta_vencimento"],
            linha[0]["dias_reavaliacao"], linha[0]["dias_atualizar_treino"]) == (0, 7, 90, 60)
    assert not linha[0]["bloquear_pagamento_pendente"]


def test_upgrade_cria_indices_e_restricoes(engine):
    _executar(engine, _carregar_migracao().upgrade)
    inspetor = inspect(engine)

    indices_matricula = {i["name"]: i for i in inspetor.get_indexes("matriculas")}
    assert indices_matricula["uq_matriculas_ativa_por_aluno"]["unique"]
    assert indices_matricula["ix_matriculas_aluno_status"]["column_names"] == ["aluno_id", "status"]
    assert "ix_alunos_professor_id" in {i["name"] for i in inspetor.get_indexes("alunos")}
    assert {i["name"] for i in inspetor.get_indexes("auditoria")} == {
        "ix_auditoria_data_hora", "ix_auditoria_user_id", "ix_auditoria_entidade"}
    assert {i["name"] for i in inspetor.get_indexes("acessos")} == {"ix_acessos_aluno_data", "ix_acessos_data_hora"}
    assert {i["name"] for i in inspetor.get_indexes("pagamentos")} == {
        "ix_pagamentos_aluno_id", "ix_pagamentos_status_vencimento"}
    assert ["ficha_id", "numero"] in [u["column_names"] for u in inspetor.get_unique_constraints("fichas_versoes")]


def test_indice_parcial_permite_uma_matricula_ativa_por_aluno(engine):
    _executar(engine, _carregar_migracao().upgrade)

    def inserir(conexao, id_, status):
        conexao.execute(text(
            "INSERT INTO matriculas (id, aluno_id, plano_id, data_inicio, data_vencimento, valor, status, "
            "criado_por_user_id, criado_em) VALUES (:i, 100, 1, '2026-11-01', '2026-11-30', 99.90, :s, 1, '2026-11-01 10:00:00')"),
            {"i": id_, "s": status})

    with engine.begin() as conexao:
        conexao.execute(text(
            "INSERT INTO planos (id, nome, duracao_dias, valor, periodicidade, criado_em) "
            "VALUES (1, 'Mensal', 30, 99.90, 'mensal', '2026-11-01 10:00:00')"))
        inserir(conexao, 1, "ativa")
        inserir(conexao, 2, "encerrada")
        inserir(conexao, 3, "cancelada")

    with pytest.raises(IntegrityError):
        with engine.begin() as conexao:
            inserir(conexao, 4, "ativa")


def test_cpf_e_codigo_acesso_sao_unicos(engine):
    _executar(engine, _carregar_migracao().upgrade)

    with engine.begin() as conexao:
        conexao.execute(text("UPDATE alunos SET cpf = '111.111.111-11' WHERE id = 100"))

    with pytest.raises(IntegrityError):
        with engine.begin() as conexao:
            conexao.execute(text("UPDATE alunos SET cpf = '111.111.111-11' WHERE id = 200"))

    with pytest.raises(IntegrityError):
        with engine.begin() as conexao:
            conexao.execute(text("UPDATE alunos SET codigo_acesso = (SELECT codigo_acesso FROM alunos WHERE id = 100) WHERE id = 200"))


def test_treino_aceita_dia_da_semana_nulo_depois_do_upgrade(engine):
    _executar(engine, _carregar_migracao().upgrade)

    with engine.begin() as conexao:
        conexao.execute(text("INSERT INTO treino (id, ficha_id, nome, dia_semana, ordem, ativo) VALUES (2, 2, 'B', NULL, 2, 1)"))

    assert _escalar(engine, "SELECT COUNT(*) FROM treino WHERE dia_semana IS NULL") == 1


def test_models_e_migracao_tem_as_mesmas_colunas(engine):
    from app.models import Base

    _executar(engine, _carregar_migracao().upgrade)
    inspetor = inspect(engine)

    for nome, tabela in Base.metadata.tables.items():
        if nome in {"historicos_execucao", "sessoes_treino"}:
            continue  # fora do schema antigo reduzido deste teste
        assert nome in inspetor.get_table_names(), nome
        assert {c.name for c in tabela.columns} == _colunas(engine, nome), nome


def test_downgrade_remove_o_que_a_migracao_criou_e_preserva_os_dados(engine):
    modulo = _carregar_migracao()
    _executar(engine, modulo.upgrade)
    with engine.begin() as conexao:
        conexao.execute(text("INSERT INTO treino (id, ficha_id, nome, dia_semana, ordem, ativo) VALUES (2, 2, 'B', NULL, 2, 1)"))

    _executar(engine, modulo.downgrade)
    inspetor = inspect(engine)

    assert not (TABELAS_NOVAS & set(inspetor.get_table_names()))
    assert _colunas(engine, "users") == {"id", "email", "senha", "tipo", "foto", "foto_public_id"}
    assert _colunas(engine, "alunos") == {"id", "user_id", "nome", "data_nascimento", "telefone"}
    assert _colunas(engine, "fichas") == {"id", "aluno_id", "professor_id", "nome", "data_criacao", "data_inicio",
                                          "data_fim", "ativo"}
    assert "observacao" not in _colunas(engine, "itens_ficha")
    assert not ({"instrucoes", "criado_por_professor_id"} & _colunas(engine, "exercicios"))
    assert not (CIRCUNFERENCIAS & _colunas(engine, "avaliacoes_fisicas"))
    assert _escalar(engine, "SELECT COUNT(*) FROM users") == 5
    assert _escalar(engine, "SELECT nome FROM alunos WHERE id = 100") == "Com Duas Fichas"
    assert _escalar(engine, "SELECT COUNT(*) FROM fichas") == 4
    assert _escalar(engine, "SELECT peso FROM avaliacoes_fisicas WHERE id = 1") == 70.5
    # treino sem dia volta a ter dia (a coluna é obrigatória de novo); o que já tinha dia não muda
    assert _escalar(engine, "SELECT dia_semana FROM treino WHERE id = 2") == "segunda"
    assert _escalar(engine, "SELECT dia_semana FROM treino WHERE id = 1") == "quarta"


def test_upgrade_depois_de_downgrade_funciona_de_novo(engine):
    modulo = _carregar_migracao()
    _executar(engine, modulo.upgrade)
    _executar(engine, modulo.downgrade)
    _executar(engine, modulo.upgrade)

    assert TABELAS_NOVAS <= set(inspect(engine).get_table_names())
    assert _escalar(engine, "SELECT COUNT(*) FROM configuracao_academia") == 1
    assert _escalar(engine, "SELECT professor_id FROM alunos WHERE id = 100") == 20


def test_upgrade_em_banco_sem_alunos_nem_fichas(engine):
    with engine.begin() as conexao:
        for tabela in ("avaliacoes_fisicas", "itens_ficha", "treino", "fichas", "alunos", "exercicios", "professores", "users"):
            conexao.execute(text(f"DELETE FROM {tabela}"))

    _executar(engine, _carregar_migracao().upgrade)

    assert _escalar(engine, "SELECT COUNT(*) FROM alunos") == 0
    assert _escalar(engine, "SELECT COUNT(*) FROM configuracao_academia") == 1

