from pydantic import BaseModel, ConfigDict

class ExercicioCriar(BaseModel):
    nome: str
    descricao: str
    grupo_muscular: str

class ExercicioAtualizar(BaseModel):
    nome: str
    descricao: str
    grupo_muscular: str

class ExercicioResposta(BaseModel):
    id: int
    nome: str
    descricao: str
    grupo_muscular: str
    imagem: str | None = None
    video: str | None = None

    model_config = ConfigDict(
        from_attributes=True
    )

class ExerciciosListaResposta(BaseModel):
    itens: list[ExercicioResposta]
    pagina: int
    limite: int
    total: int
    total_paginas: int