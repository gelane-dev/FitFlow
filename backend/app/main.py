from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import CORS_ORIGINS
from app.routers import auth, usuarios, admin, exercicios, fichas, treino, historico, sessoes, evolucao, avaliacoes

app = FastAPI(
    title="Academia API",
    description="API gerenciamento de academia",
    version="1.0.0"
)

def configurar_cors(origens_texto: str) -> dict:
    """Vazio ou "*" libera todas as origens sem credenciais; lista libera só as origens citadas, com credenciais."""
    origens = [o.strip() for o in origens_texto.split(",") if o.strip()]
    if not origens or "*" in origens:
        return {"allow_origins": ["*"], "allow_credentials": False}
    return {"allow_origins": origens, "allow_credentials": True}


app.add_middleware(
    CORSMiddleware,
    **configurar_cors(CORS_ORIGINS),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(admin.router)
app.include_router(exercicios.router)
app.include_router(fichas.router)
app.include_router(historico.router)
app.include_router(treino.router)
app.include_router(sessoes.router)
app.include_router(evolucao.router)
app.include_router(avaliacoes.router)
