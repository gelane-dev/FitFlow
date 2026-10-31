from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from ..core.tempo import agora
from ..models import Aluno, Ficha, HistoricoExecucao, ItemFicha, SessaoTreino, Treino
from ..schemas.ficha import HistoricoResposta
from ..schemas.sessao import ExecucaoCriar, SessaoResposta, SessaoResumo


def agora_naive():
    # Colunas DateTime são naive: grava o horário local do fuso da aplicação
    return agora().replace(tzinfo=None)


def _consulta_sessao(com_exercicios: bool):
    """Select de sessões já com treino e execuções carregados (evita N+1)."""
    execucoes = selectinload(SessaoTreino.execucoes)
    if com_exercicios:
        execucoes = execucoes.joinedload(HistoricoExecucao.item_ficha).joinedload(ItemFicha.exercicio)
    return select(SessaoTreino).options(joinedload(SessaoTreino.treino), execucoes)


def carregar_sessao(db: Session, sessao_id: int) -> SessaoTreino | None:
    """Sessão com tudo o que `montar_sessao` precisa, em número fixo de queries."""
    return db.scalar(_consulta_sessao(True).where(SessaoTreino.id == sessao_id))


def _duracao_segundos(sessao: SessaoTreino) -> int | None:
    """Segundos do início à finalização; None se em andamento (ou datas incoerentes)."""
    if sessao.finalizada_em is None:
        return None
    return max(0, int((sessao.finalizada_em - sessao.iniciada_em).total_seconds()))


def montar_resumo(sessao: SessaoTreino, totais: tuple[int, int, float] | None = None) -> SessaoResumo:
    """`totais` = (execuções, séries, volume) da agregação SQL; sem ele, soma as execuções carregadas."""
    if totais is None:
        execucoes = sessao.execucoes
        totais = (
            len(execucoes),
            sum(e.series_realizadas for e in execucoes),
            sum(e.series_realizadas * e.repeticoes_realizadas * e.carga_utilizada for e in execucoes),
        )
    total_execucoes, total_series, volume_total = totais
    return SessaoResumo(
        id=sessao.id,
        treino_id=sessao.treino_id,
        treino_nome=sessao.treino.nome,
        ficha_id=sessao.treino.ficha_id,
        iniciada_em=sessao.iniciada_em,
        finalizada_em=sessao.finalizada_em,
        esforco=sessao.esforco,
        comentario=sessao.comentario,
        total_execucoes=int(total_execucoes),
        total_series=int(total_series),
        volume_total=float(volume_total),
        duracao_segundos=_duracao_segundos(sessao),
    )


def montar_sessao(sessao: SessaoTreino) -> SessaoResposta:
    execucoes = sorted(sessao.execucoes, key=lambda e: (e.data_execucao, e.id))
    return SessaoResposta(
        **montar_resumo(sessao).model_dump(),
        execucoes=[HistoricoResposta.model_validate(e, from_attributes=True) for e in execucoes],
    )


def listar_sessoes_aluno(
    db: Session, aluno_id: int, limite: int | None = None, deslocamento: int = 0
) -> list[SessaoResumo]:
    # Totais por sessão numa única agregação (sem carregar as execuções: evita N+1)
    totais = (
        select(
            HistoricoExecucao.sessao_id.label("sessao_id"),
            func.count(HistoricoExecucao.id).label("execucoes"),
            func.sum(HistoricoExecucao.series_realizadas).label("series"),
            func.sum(
                HistoricoExecucao.series_realizadas
                * HistoricoExecucao.repeticoes_realizadas
                * HistoricoExecucao.carga_utilizada
            ).label("volume"),
        )
        .where(HistoricoExecucao.sessao_id.is_not(None))
        .group_by(HistoricoExecucao.sessao_id)
        .subquery()
    )
    consulta = (
        select(SessaoTreino, totais.c.execucoes, totais.c.series, totais.c.volume)
        .options(joinedload(SessaoTreino.treino))
        .outerjoin(totais, totais.c.sessao_id == SessaoTreino.id)
        .where(SessaoTreino.aluno_id == aluno_id)
        .order_by(SessaoTreino.iniciada_em.desc(), SessaoTreino.id.desc())
    )

    # Paginação opcional e aditiva: sem `limite`, devolve tudo (contrato anterior).
    if deslocamento:
        consulta = consulta.offset(deslocamento)
    if limite is not None:
        consulta = consulta.limit(limite)

    linhas = db.execute(consulta).all()

    return [
        montar_resumo(sessao, (execucoes or 0, series or 0, volume or 0.0))
        for sessao, execucoes, series, volume in linhas
    ]


def buscar_sessao_do_aluno(db: Session, sessao_id: int, aluno: Aluno) -> SessaoTreino:
    sessao = db.scalar(
        select(SessaoTreino).where(SessaoTreino.id == sessao_id, SessaoTreino.aluno_id == aluno.id))
    if not sessao:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    return sessao


def exigir_sessao_aberta(sessao: SessaoTreino) -> None:
    if sessao.finalizada_em is not None:
        raise HTTPException(status_code=409, detail="Sessão já finalizada")


def iniciar_sessao(db: Session, aluno: Aluno, treino_id: int) -> SessaoTreino:
    """Cria a sessão ou devolve a que o aluno já deixou aberta para o treino."""
    treino = db.scalar(select(Treino).where(Treino.id == treino_id, Treino.ativo.is_(True)))
    ficha = db.scalar(
        select(Ficha).where(Ficha.id == treino.ficha_id, Ficha.aluno_id == aluno.id, Ficha.ativo.is_(True))
    ) if treino else None

    if not treino or not ficha:
        raise HTTPException(status_code=404, detail="Treino não encontrado")

    aberta = db.scalar(
        select(SessaoTreino).where(
            SessaoTreino.aluno_id == aluno.id,
            SessaoTreino.treino_id == treino.id,
            SessaoTreino.finalizada_em.is_(None),
        ).order_by(SessaoTreino.iniciada_em.desc())
    )
    if aberta:
        return carregar_sessao(db, aberta.id)

    sessao = SessaoTreino(aluno_id=aluno.id, treino_id=treino.id, iniciada_em=agora_naive())
    db.add(sessao)
    try:
        db.commit()
    except IntegrityError:
        # Outro pedido criou a sessão aberta no meio-tempo (índice único parcial, ADR-029)
        db.rollback()
        sessao = db.scalar(
            select(SessaoTreino).where(
                SessaoTreino.aluno_id == aluno.id,
                SessaoTreino.treino_id == treino.id,
                SessaoTreino.finalizada_em.is_(None),
            )
        )
        if not sessao:
            raise
    return carregar_sessao(db, sessao.id)


def buscar_item_do_treino(db: Session, item_ficha_id: int, sessao: SessaoTreino) -> ItemFicha:
    item = db.scalar(
        select(ItemFicha).where(
            ItemFicha.id == item_ficha_id,
            ItemFicha.treino_id == sessao.treino_id,
            ItemFicha.ativo.is_(True),
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item da ficha não encontrado")
    return item


def registrar_execucoes(db: Session, sessao: SessaoTreino, aluno: Aluno, execucoes: list[ExecucaoCriar]) -> list[HistoricoExecucao]:
    exigir_sessao_aberta(sessao)

    # Valida tudo antes de gravar: a transação é única
    for execucao in execucoes:
        buscar_item_do_treino(db, execucao.item_ficha_id, sessao)

    momento = agora_naive()
    criados = [
        HistoricoExecucao(
            item_ficha_id=e.item_ficha_id,
            aluno_id=aluno.id,
            sessao_id=sessao.id,
            data_execucao=momento,
            series_realizadas=e.series_realizadas,
            repeticoes_realizadas=e.repeticoes_realizadas,
            carga_utilizada=e.carga_utilizada,
            observacao=e.observacao,
        )
        for e in execucoes
    ]
    db.add_all(criados)
    db.commit()

    # Recarrega com item e exercício (exercicio_id/exercicio_nome da resposta) em queries fixas
    ids = [c.id for c in criados]
    return db.scalars(
        select(HistoricoExecucao)
        .options(joinedload(HistoricoExecucao.item_ficha).joinedload(ItemFicha.exercicio))
        .where(HistoricoExecucao.id.in_(ids)).order_by(HistoricoExecucao.id)
    ).all()


def finalizar_sessao(db: Session, sessao: SessaoTreino, esforco: int | None, comentario: str | None) -> SessaoTreino:
    exigir_sessao_aberta(sessao)
    sessao.finalizada_em = agora_naive()
    sessao.esforco = esforco
    sessao.comentario = comentario
    db.commit()
    return carregar_sessao(db, sessao.id)
