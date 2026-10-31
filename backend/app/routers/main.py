# Shim de compatibilidade: o entrypoint agora é app/main.py
from app.main import app  # noqa: F401
