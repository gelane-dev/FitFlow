from decimal import Decimal

from pydantic import BaseModel

from ..core.tempo import DataHoraLocal
from .auditoria import AuditoriaItem


class TotaisAdmin(BaseModel):
    alunos: int
    ativos: int
    inativos: int
    pendentes: int
    vencidos: int
    vencendo: int
    inadimplentes: int
    professores: int
    recepcionistas: int


class AlunoRecente(BaseModel):
    id: int
    nome: str
    foto: str | None = None
    status_cadastro: str
    criado_em: DataHoraLocal | None = None


class AlunosPorProfessor(BaseModel):
    professor_id: int | None = None
    nome: str
    total: int


class AlunosPorPlano(BaseModel):
    plano_id: int
    nome: str
    total: int


class MatriculasMes(BaseModel):
    novas_mes: int
    renovacoes_mes: int
    cancelamentos_mes: int


class PontoMes(BaseModel):
    mes: str
    total: int


class PontoFrequencia(BaseModel):
    mes: str
    entradas: int
    alunos_distintos: int


class AtivosInativos(BaseModel):
    ativos: int
    inativos: int


class SeriesAdmin(BaseModel):
    cadastros_por_mes: list[PontoMes]
    frequencia_por_mes: list[PontoFrequencia]
    ativos_inativos: AtivosInativos


class DashboardAdmin(BaseModel):
    totais: TotaisAdmin
    alunos_recentes: list[AlunoRecente]
    alunos_por_professor: list[AlunosPorProfessor]
    alunos_por_plano: list[AlunosPorPlano]
    matriculas: MatriculasMes
    series: SeriesAdmin


class DashboardRecepcao(BaseModel):
    ativos: int
    entradas_hoje: int
    matriculas_hoje: int
    vencendo: int
    vencidos: int
    com_pendencia: int
    cadastros_pendentes: int
    ultimos_cadastros: list[AlunoRecente]
    atendimentos_recentes: list[AuditoriaItem]


class TotalForma(BaseModel):
    forma: str
    total: Decimal


class TotalMes(BaseModel):
    mes: str
    total: Decimal


class FinanceiroResposta(BaseModel):
    inicio: str
    fim: str
    recebido_periodo: Decimal
    pendente_total: Decimal
    vencido_total: Decimal
    inadimplentes: int
    recebido_por_mes: list[TotalMes]
    recebido_por_forma: list[TotalForma]
