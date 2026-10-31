from pydantic import BaseModel, field_validator
from datetime import date, datetime
from ..core.tempo import DataHoraLocal, para_naive_local
from ..enums.dia_semana import DiaSemana
from .treino import ItemTreinoDiaResposta

class FichaCriar(BaseModel):
    aluno_id: int
    nome: str
    data_inicio: date | None = None
    data_fim: date | None = None

class FichaListaResposta(BaseModel):
    id: int
    nome: str
    data_criacao: DataHoraLocal
    aluno_id: int
    aluno_nome: str
    data_inicio: date
    data_fim: date | None
    vigente: bool
    total_treinos: int = 0

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
    total_itens: int = 0
    itens: list[ItemTreinoDiaResposta]

class FichaResposta(BaseModel):
    id: int
    nome: str
    professor_nome: str | None = None
    data_criacao: DataHoraLocal
    data_inicio: date
    data_fim: date | None
    vigente: bool
    itens: list[ItemFichaResposta]

class FichaCompletaResposta(BaseModel):
    id: int
    nome: str
    professor_nome: str | None = None
    data_criacao: DataHoraLocal
    data_inicio: date
    data_fim: date | None
    vigente: bool
    treinos: list[TreinoComItensResposta]

class AtualizarFicha(BaseModel):
    nome: str
    data_inicio: date | None = None
    data_fim: date | None = None

class AtualizarItemFicha(BaseModel):
    series: int
    repeticoes: int
    carga: float
    descanso: int
    ordem: int

class ExecucaoHistorico(BaseModel):
    item_ficha_id: int
    data_execucao: DataHoraLocal
    series_realizadas: int
    repeticoes_realizadas: int
    carga_utilizada: float
    observacao: str | None
    sessao_id: int | None = None

    @field_validator("data_execucao")
    @classmethod
    def normalizar_fuso(cls, valor: datetime) -> datetime:
        return para_naive_local(valor)

class HistoricoResposta(BaseModel):
    id: int
    item_ficha_id: int
    sessao_id: int | None
    exercicio_id: int
    exercicio_nome: str
    data_execucao: DataHoraLocal
    series_realizadas: int
    repeticoes_realizadas: int
    carga_utilizada: float
    observacao: str | None
