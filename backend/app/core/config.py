import os
from dotenv import load_dotenv

load_dotenv()


def obter_obrigatoria(nome: str) -> str:
    """Lê uma variável de ambiente obrigatória; falha com mensagem clara se faltar."""
    valor = os.getenv(nome)
    if not valor:
        raise RuntimeError(
            f"Variável de ambiente {nome} não definida. "
            "Copie backend/.env.exemplo para backend/.env e preencha os valores."
        )
    return valor


# DATABASE_URL e SECRET_KEY são validadas onde são usadas (database.py, alembic/env.py
# e seguranca.py), para que, por exemplo, o alembic não exija SECRET_KEY.
SQL_ECHO = os.getenv("SQL_ECHO", "false").strip().lower() in ("1", "true", "yes", "sim")

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

# Expiração do token JWT, em minutos
JWT_EXPIRA_MINUTOS = int(os.getenv("JWT_EXPIRA_MINUTOS") or 30)

# Origens permitidas no CORS (separadas por vírgula). Vazio ou "*" libera tudo, sem credenciais.
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "").strip()

# Fuso usado em "treino de hoje" e nas datas geradas pelo servidor
APP_TIMEZONE = os.getenv("APP_TIMEZONE") or "America/Sao_Paulo"

# Cookie de sessão da web (ADR-034)
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").strip().lower() in ("1", "true", "yes", "sim")
COOKIE_SAMESITE = (os.getenv("COOKIE_SAMESITE") or "lax").strip().lower()
if COOKIE_SAMESITE not in ("lax", "strict", "none"):
    raise RuntimeError("COOKIE_SAMESITE deve ser lax, strict ou none")
if COOKIE_SAMESITE == "none" and not COOKIE_SECURE:
    raise RuntimeError("COOKIE_SAMESITE=none exige COOKIE_SECURE=true (os navegadores rejeitam o cookie sem Secure)")
