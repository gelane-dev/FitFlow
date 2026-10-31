from pydantic import BaseModel, ConfigDict, EmailStr, Field
from ..enums.dia_semana import DiaSemana

class TreinoCriar(BaseModel):
    ficha_id: int
    nome: str
    dia_semana: DiaSemana
    ordem: int

class TreinoResposta(BaseModel):
    id: int
    ficha_id: int
    nome: str
    dia_semana: DiaSemana
    ordem: int
    total_itens: int = 0

    model_config = ConfigDict(from_attributes=True)

class AtualizarTreino(BaseModel):
    nome: str
    dia_semana: DiaSemana
    ordem: int

class ItemTreinoDiaResposta(BaseModel):
    id: int
    ficha_id: int
    treino_id: int
    exercicio_id: int
    series: int
    repeticoes: int
    carga: float
    descanso: int
    ordem: int
    nome: str
    descricao: str
    grupo_muscular: str
    imagem: str | None
    video: str | None

class TreinoDiaResposta(BaseModel):
    id: int
    ficha_id: int
    nome: str
    dia_semana: DiaSemana
    ordem: int
    itens: list[ItemTreinoDiaResposta]

class OrdemItem(BaseModel):
    id: int
    ordem: int = Field(ge=1)

class OrdenarItens(BaseModel):
    itens: list[OrdemItem] = Field(min_length=1)
