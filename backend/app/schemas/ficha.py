from pydantic import BaseModel
from datetime import datetime
from ..enums.dia_semana import DiaSemana

class FichaCriar(BaseModel):
    aluno_id: int
    nome: str

class FichaListaResposta(BaseModel):
    id: int
    nome: str
    data_criacao: datetime
    aluno_id: int
    aluno_nome: str

class ItemFichaCriar(BaseModel):
    ficha_id: int
    treino_id: int
    exercicio_id: int
    series: int
    repeticoes: int
    carga: float
    descanso: int
    ordem: int

class ItemFichaResposta(BaseModel):
    id: int
    ficha_id: int
    treino_id: int
    exercicio_id: int
    series: int
    repeticoes: int
    carga: float
    descanso: int
    ordem: int

class TreinoComItensResposta(BaseModel):
    id: int
    ficha_id: int
    nome: str
    dia_semana: DiaSemana
    ordem: int
    itens: list[ItemFichaResposta]

class FichaResposta(BaseModel):
    id: int
    nome: str
    data_criacao: datetime
    itens: list[ItemFichaResposta]

class FichaCompletaResposta(BaseModel):
    id: int
    nome: str
    data_criacao: datetime
    treinos: list[TreinoComItensResposta]

class AtualizarFicha(BaseModel):
    nome: str

class AtualizarItemFicha(BaseModel):
    series: int
    repeticoes: int
    carga: float
    descanso: int
    ordem: int

class ExecucaoHistorico(BaseModel):
    item_ficha_id: int
    data_execucao: datetime
    series_realizadas: int
    repeticoes_realizadas: int
    carga_utilizada: float
    observacao: str | None
    
class HistoricoResposta(BaseModel):
    id: int
    item_ficha_id: int
    data_execucao: datetime
    series_realizadas: int
    repeticoes_realizadas: int
    carga_utilizada: float
    observacao: str | None 





    