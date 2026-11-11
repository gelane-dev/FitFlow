from datetime import date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.tempo import agora
from ..models import Acesso, Aluno, SessaoTreino
from ..schemas.professor_web import EntradasSemana, FrequenciaResposta


def _subtrair_meses(dia: date, meses: int) -> date:
    ano, mes = divmod(dia.year * 12 + (dia.month - 1) - meses, 12)
    return _clamp(ano, mes + 1, dia.day)


def _clamp(ano: int, mes: int, dia: int) -> date:
    primeiro_proximo = date(ano + (mes == 12), mes % 12 + 1, 1)
    ultimo = (primeiro_proximo - timedelta(days=1)).day
    return date(ano, mes, min(dia, ultimo))


def calcular_frequencia(db: Session, aluno: Aluno, meses: int = 6) -> FrequenciaResposta:
    """Entradas liberadas por semana (segunda a domingo) nos últimos `meses` meses, até hoje."""
    hoje = agora().date()
    inicio = _subtrair_meses(hoje, meses)
    limite_inicio = datetime.combine(inicio, time.min)
    limite_fim = datetime.combine(hoje + timedelta(days=1), time.min)

    datas = db.scalars(
        select(Acesso.data_hora).where(
            Acesso.aluno_id == aluno.id, Acesso.resultado == "liberado",
            Acesso.data_hora >= limite_inicio, Acesso.data_hora < limite_fim)).all()

    por_semana: dict[date, int] = {}
    semana = inicio - timedelta(days=inicio.weekday())
    while semana <= hoje:
        por_semana[semana] = 0
        semana += timedelta(days=7)
    for data_hora in datas:
        dia = data_hora.date()
        por_semana[dia - timedelta(days=dia.weekday())] += 1

    ultima = db.scalar(
        select(Acesso.data_hora).where(Acesso.aluno_id == aluno.id, Acesso.resultado == "liberado")
        .order_by(Acesso.data_hora.desc()).limit(1))

    sessoes = db.scalars(
        select(SessaoTreino.id).where(
            SessaoTreino.aluno_id == aluno.id, SessaoTreino.finalizada_em.is_not(None),
            SessaoTreino.iniciada_em >= limite_inicio, SessaoTreino.iniciada_em < limite_fim)).all()

    return FrequenciaResposta(
        entradas_por_semana=[EntradasSemana(semana_inicio=s, total=t) for s, t in sorted(por_semana.items())],
        total_periodo=len(datas),
        ultima_entrada=ultima,
        sessoes_treino_periodo=len(sessoes),
    )
