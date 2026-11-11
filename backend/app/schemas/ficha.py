from typing import Literal

from pydantic import BaseModel, Field, field_validator
from datetime import date, datetime
from ..core.tempo import DataHoraLocal, para_naive_local
from ..enums.dia_semana import DiaSemana
from .treino import ItemTreinoDiaResposta

StatusFicha = Literal["rascunho", "publicada"]


class FichaCriar(BaseModel):
    aluno_id: int
    nome: str
    status: StatusFicha = "publicada"
    objetivo: str | None = Field(default=None, max_length=300)
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
    status: StatusFicha = "publicada"
    objetivo: str | None = None
    atualizado_em: DataHoraLocal | None = None
    professor_id: int | None = None
    professor_nome: str | None = None

class ItemFichaCriar(BaseModel):
    ficha_id: int
    treino_id: int
    exercicio_id: int
    series: int
    repeticoes: int
    carga: float
    descanso: int
    ordem: int
    observacao: str | None = Field(default=None, max_length=300)

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
    observacao: str | None = None

class TreinoComItensResposta(BaseModel):
    id: int
    ficha_id: int
    nome: str
    dia_semana: DiaSemana | None = None
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
    status: StatusFicha = "publicada"
    objetivo: str | None = None

class FichaCompletaResposta(BaseModel):
    id: int
    nome: str
    professor_nome: str | None = None
    data_criacao: DataHoraLocal
    data_inicio: date
    data_fim: date | None
    vigente: bool
    treinos: list[TreinoComItensResposta]
    aluno_id: int | None = None
    status: StatusFicha = "publicada"
    objetivo: str | None = None
    atualizado_em: DataHoraLocal | None = None

class AtualizarFicha(BaseModel):
    nome: str
    data_inicio: date | None = None
    data_fim: date | None = None
    objetivo: str | None = Field(default=None, max_length=300)

class ItemFichaCompleta(BaseModel):
    """Item no estado completo da ficha: com `id` atualiza o item existente; sem `id` cria um novo."""
    id: int | None = None
    exercicio_id: int
    series: int
    repeticoes: int
    carga: float
    descanso: int
    ordem: int
    observacao: str | None = Field(default=None, max_length=300)

class TreinoFichaCompleta(BaseModel):
    """Treino no estado completo da ficha: com `id` atualiza o treino existente; sem `id` cria um novo."""
    id: int | None = None
    nome: str
    dia_semana: DiaSemana | None = None
    ordem: int
    itens: list[ItemFichaCompleta] = []

class AtualizarFichaCompleta(BaseModel):
    nome: str
    data_inicio: date | None = None
    data_fim: date | None = None
    objetivo: str | None = Field(default=None, max_length=300)
    treinos: list[TreinoFichaCompleta]

class AtualizarItemFicha(BaseModel):
    series: int
    repeticoes: int
    carga: float
    descanso: int
    ordem: int
    observacao: str | None = Field(default=None, max_length=300)

class DuplicarFicha(BaseModel):
    aluno_id: int | None = None
    nome: str | None = Field(default=None, min_length=1, max_length=150)

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
