import importlib
import os
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent


def _importar_em_processo_limpo(modulo, **env):
    ambiente = {**os.environ, **env}
    return subprocess.run(
        [sys.executable, "-c", f"import {modulo}"],
        cwd=BACKEND, env=ambiente, capture_output=True, text=True,
    )


def test_obter_obrigatoria_falha_sem_variavel(monkeypatch):
    from app.core import config
    monkeypatch.delenv("VARIAVEL_INEXISTENTE", raising=False)
    with pytest.raises(RuntimeError, match="VARIAVEL_INEXISTENTE"):
        config.obter_obrigatoria("VARIAVEL_INEXISTENTE")


def test_database_url_obrigatoria_no_engine():
    r = _importar_em_processo_limpo("app.database", DATABASE_URL="", SECRET_KEY="x")
    assert r.returncode != 0
    assert "DATABASE_URL" in r.stderr and "RuntimeError" in r.stderr


def test_secret_key_obrigatoria_na_seguranca():
    r = _importar_em_processo_limpo("app.core.seguranca", DATABASE_URL="sqlite://", SECRET_KEY="")
    assert r.returncode != 0
    assert "SECRET_KEY" in r.stderr and "RuntimeError" in r.stderr


def test_config_nao_exige_secret_key_nem_database_url():
    r = _importar_em_processo_limpo("app.core.config", DATABASE_URL="", SECRET_KEY="")
    assert r.returncode == 0, r.stderr


def test_sql_echo_padrao_false_e_ativavel(monkeypatch):
    from app.core import config
    try:
        monkeypatch.delenv("SQL_ECHO", raising=False)
        importlib.reload(config)
        assert config.SQL_ECHO is False
        monkeypatch.setenv("SQL_ECHO", "true")
        importlib.reload(config)
        assert config.SQL_ECHO is True
    finally:
        monkeypatch.undo()
        importlib.reload(config)
