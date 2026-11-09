import os
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
URL_POSTGRES = os.getenv("TEST_POSTGRES_URL")

precisa_postgres = pytest.mark.skipif(
    not URL_POSTGRES,
    reason="defina TEST_POSTGRES_URL; e4444f75bdc7 usa ALTER ADD CONSTRAINT, que o SQLite não suporta",
)


def _alembic(*comando):
    ambiente = {**os.environ, "DATABASE_URL": URL_POSTGRES, "SECRET_KEY": "x"}
    r = subprocess.run([sys.executable, "-m", "alembic", *comando], cwd=BACKEND, env=ambiente,
                       capture_output=True, text=True)
    assert r.returncode == 0, f"alembic {' '.join(comando)} falhou:\n{r.stdout}\n{r.stderr}"
    return r


@pytest.fixture
def banco_limpo():
    """Schema público vazio antes e depois: as migrações devem partir do zero."""
    from sqlalchemy import create_engine, text

    from banco_seguro import validar_url_banco_teste

    # defesa extra: este fixture zera o schema public
    validar_url_banco_teste(URL_POSTGRES)
    engine = create_engine(URL_POSTGRES)

    def _zerar():
        with engine.begin() as conexao:
            conexao.execute(text("DROP SCHEMA public CASCADE"))
            conexao.execute(text("CREATE SCHEMA public"))

    _zerar()
    yield engine
    _zerar()
    # devolve o schema esperado pelo restante da suíte (conftest cria as tabelas uma vez por sessão)
    from app.models import Base

    Base.metadata.create_all(engine)
    engine.dispose()


@precisa_postgres
def test_upgrade_downgrade_upgrade_e_check_em_postgres(banco_limpo):
    from sqlalchemy import inspect

    _alembic("upgrade", "head")
    assert "sessoes_treino" in inspect(banco_limpo).get_table_names()
    indices = {i["name"]: i["column_names"] for i in inspect(banco_limpo).get_indexes("historicos_execucao")}
    assert indices["ix_historicos_execucao_aluno_data"] == ["aluno_id", "data_execucao"]

    _alembic("downgrade", "base")
    assert inspect(banco_limpo).get_table_names() == ["alembic_version"]

    _alembic("upgrade", "head")
    # models e migrações não podem divergir
    r = _alembic("check")
    assert "No new upgrade operations detected" in r.stdout + r.stderr


def test_cadeia_de_migracoes_tem_uma_unica_head():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    config = Config(str(BACKEND / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND / "alembic"))
    script = ScriptDirectory.from_config(config)

    assert script.get_heads() == ["a6b7c8d9e0f1"]
    # as migrações das fases 3-5 se encadeiam após b1c2d3e4f5a6
    cadeia = [r.revision for r in script.walk_revisions()][:6]
    assert cadeia == ["a6b7c8d9e0f1", "f5a6b7c8d9e0", "e4f5a6b7c8d9", "d3e4f5a6b7c8", "c2d3e4f5a6b7", "b1c2d3e4f5a6"]


def test_migracao_do_indice_de_historico_encadeia_em_f5a6b7c8d9e0():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    config = Config(str(BACKEND / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND / "alembic"))
    revisao = ScriptDirectory.from_config(config).get_revision("a6b7c8d9e0f1")
    assert revisao.down_revision == "f5a6b7c8d9e0"


def test_model_declara_o_indice_de_historico():
    from app.models import HistoricoExecucao

    indices = {i.name: [c.name for c in i.columns] for i in HistoricoExecucao.__table__.indexes}
    assert indices["ix_historicos_execucao_aluno_data"] == ["aluno_id", "data_execucao"]
