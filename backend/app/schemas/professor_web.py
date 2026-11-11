from datetime import date

from pydantic import BaseModel

from ..core.tempo import DataHoraLocal
from .ficha import FichaCompletaResposta


class AutorVersao(BaseModel):
    id: int
    nome: str | None
    tipo: str


class FichaVersaoResumo(BaseModel):
    numero: int
    publicada_em: DataHoraLocal
    publicada_por: AutorVersao


class FichaVersaoResposta(FichaVersaoResumo):
    conteudo: FichaCompletaResposta


class AlunoResumo(BaseModel):
    id: int
    nome: str


class UltimoAluno(AlunoResumo):
    professor_vinculado_em: DataHoraLocal | None


class ProximaAvaliacao(BaseModel):
    aluno: AlunoResumo
    ultima: date | None
    proxima: date


class ProfessorDashboardResposta(BaseModel):
    total_alunos: int
    alunos_ativos: int
    avaliacoes_pendentes: int
    fichas_ativas: int
    fichas_rascunho: int
    fichas_desatualizadas: int
    ultimos_alunos: list[UltimoAluno]
    proximas_avaliacoes: list[ProximaAvaliacao]


class EntradasSemana(BaseModel):
    semana_inicio: date
    total: int


class FrequenciaResposta(BaseModel):
    entradas_por_semana: list[EntradasSemana]
    total_periodo: int
    ultima_entrada: DataHoraLocal | None
    sessoes_treino_periodo: int
