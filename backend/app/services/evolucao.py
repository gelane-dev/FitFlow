from collections import defaultdict

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Exercicio, HistoricoExecucao, ItemFicha
from ..schemas.evolucao import EvolucaoExercicio, EvolucaoExercicioResumo, PontoEvolucao


def _registros_do_aluno(db: Session, aluno_id: int, exercicio_id: int | None = None):
    consulta = (
        select(HistoricoExecucao, Exercicio)
        .join(ItemFicha, HistoricoExecucao.item_ficha_id == ItemFicha.id)
        .join(Exercicio, ItemFicha.exercicio_id == Exercicio.id)
        .where(HistoricoExecucao.aluno_id == aluno_id)
        .order_by(HistoricoExecucao.data_execucao, HistoricoExecucao.id)
    )
    if exercicio_id is not None:
        consulta = consulta.where(Exercicio.id == exercicio_id)
    return db.execute(consulta).all()


def resumo_exercicios(db: Session, aluno_id: int) -> list[EvolucaoExercicioResumo]:
    """Um item por exercício com registros do aluno (inclusive exercícios já inativados)."""
    por_exercicio: dict[int, list] = defaultdict(list)
    exercicios: dict[int, Exercicio] = {}
    for historico, exercicio in _registros_do_aluno(db, aluno_id):
        por_exercicio[exercicio.id].append(historico)
        exercicios[exercicio.id] = exercicio

    resumos = []
    for exercicio_id, registros in por_exercicio.items():
        ultimo = registros[-1]  # já ordenado por data_execucao, id
        resumos.append(EvolucaoExercicioResumo(
            exercicio_id=exercicio_id,
            nome=exercicios[exercicio_id].nome,
            grupo_muscular=exercicios[exercicio_id].grupo_muscular,
            total_registros=len(registros),
            ultima_carga=ultimo.carga_utilizada,
            carga_maxima=max(r.carga_utilizada for r in registros),
            ultima_data=ultimo.data_execucao,
        ))
    return sorted(resumos, key=lambda r: r.ultima_data, reverse=True)


def evolucao_exercicio(db: Session, aluno_id: int, exercicio_id: int) -> EvolucaoExercicio:
    registros = _registros_do_aluno(db, aluno_id, exercicio_id)
    if not registros:
        raise HTTPException(status_code=404, detail="Sem registros para este exercício")

    por_dia: dict = defaultdict(list)
    for historico, _ in registros:
        por_dia[historico.data_execucao.date()].append(historico)

    pontos = [
        PontoEvolucao(
            data=dia,
            carga_maxima=max(r.carga_utilizada for r in dia_registros),
            volume=sum(r.series_realizadas * r.repeticoes_realizadas * r.carga_utilizada for r in dia_registros),
            registros=len(dia_registros),
        )
        for dia, dia_registros in sorted(por_dia.items())
    ]
    return EvolucaoExercicio(exercicio_id=exercicio_id, nome=registros[0][1].nome, pontos=pontos)
