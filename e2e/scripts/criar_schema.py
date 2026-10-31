"""Cria o schema no SQLite do E2E.

Tenta `alembic upgrade head`. As migrações do projeto foram escritas para PostgreSQL:
a e4444f75bdc7 usa `op.create_foreign_key`/`drop_constraint`, que o SQLite não suporta
(ALTER TABLE ... ADD CONSTRAINT). Quando o alembic falha, o banco parcial é descartado e o
schema sai de `Base.metadata.create_all`, que reflete os models atuais.

Uso (cwd = backend/, DATABASE_URL já definida): python criar_schema.py <arquivo.db>
"""
import os
import subprocess
import sys

caminho_db = sys.argv[1]

resultado = subprocess.run(
    [sys.executable, "-m", "alembic", "upgrade", "head"],
    capture_output=True, text=True, env=os.environ.copy(),
)
if resultado.returncode == 0:
    print("schema: alembic upgrade head OK")
    sys.exit(0)

ultima_linha = (resultado.stderr.strip().splitlines() or ["?"])[-1]
print(f"schema: alembic falhou no SQLite ({ultima_linha}); usando Base.metadata.create_all")

if os.path.exists(caminho_db):
    os.remove(caminho_db)

sys.path.insert(0, os.getcwd())  # o script mora fora de backend/; `app` fica no cwd

from app.database import engine  # noqa: E402
from app.models import Base  # noqa: E402

Base.metadata.create_all(engine)
print("schema: create_all OK")
