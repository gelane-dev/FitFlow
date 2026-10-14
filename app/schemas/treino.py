from pydantic import BaseModel, ConfigDict, EmailStr
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