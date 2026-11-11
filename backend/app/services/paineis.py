"""Painéis: dashboards de admin e recepção e financeiro. Situação e inadimplência vêm de services/matriculas."""
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import distinct, extract, func, select
from sqlalchemy.orm import Session, aliased

from ..core.tempo import agora_naive, hoje
from ..models import Acesso, Aluno, Matricula, Pagamento, Plano, Professor, Recepcionista, User
from . import auditoria
from .matriculas import (
    condicao_aluno_ativo, condicao_com_pendencia, condicao_inadimplente, dias_alerta_vencimento, filtro_situacao,
)

SEM_DATA = "sem_data"


def _contar(db: Session, *condicoes, junta_usuario: bool = True) -> int:
    consulta = select(func.count(Aluno.id))
    if junta_usuario:
        consulta = consulta.join(User, User.id == Aluno.user_id)
    return db.scalar(consulta.where(*condicoes)) or 0


def ultimos_meses(referencia: date, quantidade: int = 12) -> list[tuple[int, int]]:
    """(ano, mês) dos últimos `quantidade` meses, do mais antigo ao mês de `referencia`."""
    indice = referencia.year * 12 + referencia.month - 1
    return [(i // 12, i % 12 + 1) for i in range(indice - quantidade + 1, indice + 1)]


def _rotulo(ano: int, mes: int) -> str:
    return f"{ano:04d}-{mes:02d}"


def _inicio_janela(meses: list[tuple[int, int]]) -> datetime:
    return datetime(meses[0][0], meses[0][1], 1)


def _por_mes(db: Session, coluna_data, valor, filtros: list, meses: list[tuple[int, int]]) -> dict[str, list]:
    """Agrupa por (ano, mês) com SQL portável (extract) dentro da janela de meses."""
    ano, mes = extract("year", coluna_data), extract("month", coluna_data)
    linhas = db.execute(
        select(ano, mes, *valor).where(coluna_data >= _inicio_janela(meses), *filtros).group_by(ano, mes)
    ).all()
    return {_rotulo(int(a), int(m)): list(resto) for a, m, *resto in linhas}


def _recentes(db: Session, limite: int = 5) -> list[dict]:
    linhas = db.execute(
        select(Aluno, User).join(User, User.id == Aluno.user_id)
        .order_by(User.criado_em.is_(None), User.criado_em.desc(), Aluno.id.desc()).limit(limite)
    ).all()
    return [
        {"id": a.id, "nome": a.nome, "foto": u.foto, "status_cadastro": a.status_cadastro, "criado_em": u.criado_em}
        for a, u in linhas
    ]


def _totais_situacao(db: Session, referencia: date, alerta: int) -> dict:
    ativo = condicao_aluno_ativo(referencia)
    aprovados = Aluno.status_cadastro == "aprovado"
    ativos = _contar(db, ativo)
    return {
        "ativos": ativos,
        "inativos": _contar(db, aprovados) - ativos,
        "pendentes": _contar(db, filtro_situacao("pendente", referencia, alerta)),
        "vencidos": _contar(db, filtro_situacao("vencida", referencia, alerta)),
        "vencendo": _contar(db, filtro_situacao("vencendo", referencia, alerta)),
        "inadimplentes": _contar(db, condicao_inadimplente()),
    }


def dashboard_admin(db: Session) -> dict:
    referencia = hoje()
    alerta = dias_alerta_vencimento(db)
    situacao = _totais_situacao(db, referencia, alerta)

    totais = {
        "alunos": _contar(db, junta_usuario=False),
        **situacao,
        "professores": db.scalar(select(func.count(Professor.id)).join(User, User.id == Professor.user_id).where(User.ativo.is_(True))) or 0,
        "recepcionistas": db.scalar(select(func.count(Recepcionista.id)).join(User, User.id == Recepcionista.user_id).where(User.ativo.is_(True))) or 0,
    }

    por_professor = db.execute(
        select(Aluno.professor_id, Professor.nome, func.count(Aluno.id))
        .outerjoin(Professor, Professor.id == Aluno.professor_id)
        .group_by(Aluno.professor_id, Professor.nome)
        .order_by(func.count(Aluno.id).desc(), Professor.nome)
    ).all()

    por_plano = db.execute(
        select(Plano.id, Plano.nome, func.count(Matricula.id))
        .join(Matricula, Matricula.plano_id == Plano.id).where(Matricula.status == "ativa")
        .group_by(Plano.id, Plano.nome).order_by(func.count(Matricula.id).desc(), Plano.nome)
    ).all()

    inicio_mes = datetime(referencia.year, referencia.month, 1)
    novas = db.scalar(select(func.count(Matricula.id)).where(
        Matricula.criado_em >= inicio_mes, Matricula.matricula_anterior_id.is_(None))) or 0
    renovacoes = _contar_renovacoes(db, inicio_mes)
    cancelamentos = db.scalar(select(func.count(Matricula.id)).where(Matricula.cancelada_em >= inicio_mes)) or 0

    meses = ultimos_meses(referencia)
    cadastros = _por_mes(db, User.criado_em, [func.count(User.id)], [User.tipo == "aluno"], meses)
    sem_data = db.scalar(select(func.count(User.id)).where(User.tipo == "aluno", User.criado_em.is_(None))) or 0
    cadastros_serie = [{"mes": _rotulo(a, m), "total": (cadastros.get(_rotulo(a, m)) or [0])[0]} for a, m in meses]
    cadastros_serie.append({"mes": SEM_DATA, "total": sem_data})

    frequencia = _por_mes(
        db, Acesso.data_hora, [func.count(Acesso.id), func.count(distinct(Acesso.aluno_id))],
        [Acesso.resultado == "liberado"], meses,
    )
    frequencia_serie = [
        {"mes": _rotulo(a, m), "entradas": (frequencia.get(_rotulo(a, m)) or [0, 0])[0],
         "alunos_distintos": (frequencia.get(_rotulo(a, m)) or [0, 0])[1]}
        for a, m in meses
    ]

    return {
        "totais": totais,
        "alunos_recentes": _recentes(db),
        "alunos_por_professor": [
            {"professor_id": pid, "nome": nome or "Sem professor", "total": total} for pid, nome, total in por_professor
        ],
        "alunos_por_plano": [{"plano_id": pid, "nome": nome, "total": total} for pid, nome, total in por_plano],
        "matriculas": {"novas_mes": novas, "renovacoes_mes": renovacoes, "cancelamentos_mes": cancelamentos},
        "series": {
            "cadastros_por_mes": cadastros_serie,
            "frequencia_por_mes": frequencia_serie,
            "ativos_inativos": {"ativos": situacao["ativos"], "inativos": situacao["inativos"]},
        },
    }


def _contar_renovacoes(db: Session, inicio_mes: datetime) -> int:
    """Renovação = matrícula criada no mês cuja anterior foi `encerrada` (troca de plano deixa `substituida`)."""
    anterior = aliased(Matricula)
    return db.scalar(
        select(func.count(Matricula.id)).join(anterior, anterior.id == Matricula.matricula_anterior_id)
        .where(Matricula.criado_em >= inicio_mes, anterior.status == "encerrada")
    ) or 0


def dashboard_recepcao(db: Session) -> dict:
    referencia = hoje()
    alerta = dias_alerta_vencimento(db)
    inicio_dia = datetime.combine(referencia, time.min)
    fim_dia = inicio_dia + timedelta(days=1)

    atendimentos = db.execute(
        auditoria.consulta_auditoria(
            tipos_usuario=("recepcao", "admin"),
            prefixos_acao=("aluno.", "matricula.", "pagamento.", "acesso."),
        ).limit(10)
    ).all()

    return {
        "ativos": _contar(db, condicao_aluno_ativo(referencia)),
        "entradas_hoje": db.scalar(select(func.count(Acesso.id)).where(
            Acesso.resultado == "liberado", Acesso.data_hora >= inicio_dia, Acesso.data_hora < fim_dia)) or 0,
        "matriculas_hoje": db.scalar(select(func.count(Matricula.id)).where(
            Matricula.criado_em >= inicio_dia, Matricula.criado_em < fim_dia)) or 0,
        "vencendo": _contar(db, filtro_situacao("vencendo", referencia, alerta)),
        "vencidos": _contar(db, filtro_situacao("vencida", referencia, alerta)),
        "com_pendencia": _contar(db, condicao_com_pendencia()),
        "cadastros_pendentes": _contar(db, filtro_situacao("pendente", referencia, alerta)),
        "ultimos_cadastros": _recentes(db),
        "atendimentos_recentes": [auditoria.para_item(linha) for linha in atendimentos],
    }


def _dinheiro(valor) -> Decimal:
    """Valor monetário com 2 casas (serializa como "0.00", não "0")."""
    return Decimal(str(valor or 0)).quantize(Decimal("0.01"))


def _soma(db: Session, *filtros) -> Decimal:
    return _dinheiro(db.scalar(select(func.sum(Pagamento.valor)).where(*filtros)))


def financeiro(db: Session, inicio: date | None, fim: date | None) -> dict:
    referencia = hoje()
    inicio = inicio or referencia.replace(day=1)
    fim = fim or ((inicio.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1))

    if inicio > fim:
        raise HTTPException(status_code=422, detail="Data inicial não pode ser posterior à final")

    recebido = func.coalesce(Pagamento.valor_recebido, Pagamento.valor)
    periodo = [
        Pagamento.status == "pago",
        Pagamento.pago_em >= datetime.combine(inicio, time.min),
        Pagamento.pago_em < datetime.combine(fim + timedelta(days=1), time.min),
    ]

    recebido_periodo = _dinheiro(db.scalar(select(func.sum(recebido)).where(*periodo)))
    por_forma = db.execute(
        select(Pagamento.forma, func.sum(recebido)).where(*periodo).group_by(Pagamento.forma).order_by(func.sum(recebido).desc())
    ).all()

    meses = ultimos_meses(referencia)
    por_mes = _por_mes(db, Pagamento.pago_em, [func.sum(recebido)], [Pagamento.status == "pago"], meses)

    vencido = [Pagamento.status == "pendente", Pagamento.vencimento < referencia]

    return {
        "inicio": inicio.isoformat(),
        "fim": fim.isoformat(),
        "recebido_periodo": recebido_periodo,
        "pendente_total": _soma(db, Pagamento.status == "pendente"),
        "vencido_total": _soma(db, *vencido),
        "inadimplentes": db.scalar(select(func.count(distinct(Pagamento.aluno_id))).where(*vencido)) or 0,
        "recebido_por_mes": [
            {"mes": _rotulo(a, m), "total": _dinheiro((por_mes.get(_rotulo(a, m)) or [0])[0])}
            for a, m in meses
        ],
        "recebido_por_forma": [{"forma": forma or "outro", "total": _dinheiro(total)} for forma, total in por_forma],
    }
