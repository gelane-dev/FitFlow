from datetime import datetime, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..core.tempo import agora
from ..models import Aluno, AvaliacaoFisica, Ficha, Professor, User
from ..schemas.professor_web import AlunoResumo, ProfessorDashboardResposta, ProximaAvaliacao, UltimoAluno
from .configuracao import obter_configuracao
from .matriculas import condicao_aluno_ativo, condicao_aluno_habilitado

LIMITE_ULTIMOS_ALUNOS = 5
LIMITE_PROXIMAS_AVALIACOES = 10


def montar_dashboard(db: Session, professor: Professor) -> ProfessorDashboardResposta:
    configuracao = obter_configuracao(db)
    momento = agora()
    hoje = momento.date()
    agora_local = momento.replace(tzinfo=None)

    # Alunos vinculados; "ativo" e "habilitado" vêm das condições únicas de services/matriculas.py
    vinculados = list(db.scalars(select(Aluno).where(Aluno.professor_id == professor.id)).all())
    ids_vinculados = [aluno.id for aluno in vinculados]
    ids_habilitados = set(db.scalars(
        select(Aluno.id).join(User, User.id == Aluno.user_id)
        .where(Aluno.id.in_(ids_vinculados), condicao_aluno_habilitado())).all())
    ids_ativos = set(db.scalars(
        select(Aluno.id).join(User, User.id == Aluno.user_id)
        .where(Aluno.id.in_(ids_vinculados), condicao_aluno_ativo(hoje))).all())

    habilitados = [aluno for aluno in vinculados if aluno.id in ids_habilitados]
    alunos_ativos = [aluno for aluno in vinculados if aluno.id in ids_ativos]

    # Avaliações: última por aluno habilitado; pendente = nunca avaliado ou última há mais de dias_reavaliacao
    ultimas = dict(db.execute(
        select(AvaliacaoFisica.aluno_id, func.max(AvaliacaoFisica.data_avaliacao))
        .where(AvaliacaoFisica.aluno_id.in_([aluno.id for aluno in habilitados]))
        .group_by(AvaliacaoFisica.aluno_id)).all())
    proximas = []
    for aluno in habilitados:
        ultima = ultimas.get(aluno.id)
        proxima = hoje if ultima is None else ultima.date() + timedelta(days=configuracao.dias_reavaliacao)
        proximas.append((proxima, aluno.id, aluno, ultima))
    pendentes = [item for item in proximas
                 if item[3] is None or (hoje - item[3].date()).days > configuracao.dias_reavaliacao]
    proximas.sort(key=lambda item: (item[0], item[1]))

    # Fichas do professor
    limite_desatualizada = agora_local - timedelta(days=configuracao.dias_atualizar_treino)
    base = (Ficha.professor_id == professor.id, Ficha.ativo.is_(True))
    fichas_ativas = db.scalar(select(func.count(Ficha.id)).where(*base, Ficha.status == "publicada"))
    fichas_rascunho = db.scalar(select(func.count(Ficha.id)).where(*base, Ficha.status == "rascunho"))
    fichas_desatualizadas = db.scalar(select(func.count(Ficha.id)).where(
        *base, Ficha.status == "publicada",
        or_(func.coalesce(Ficha.atualizado_em, Ficha.data_criacao) < limite_desatualizada,
            Ficha.data_fim < hoje)))

    recentes = sorted(
        vinculados,
        key=lambda aluno: (aluno.professor_vinculado_em or datetime.min, aluno.id), reverse=True,
    )[:LIMITE_ULTIMOS_ALUNOS]

    return ProfessorDashboardResposta(
        total_alunos=len(vinculados),
        alunos_ativos=len(alunos_ativos),
        avaliacoes_pendentes=len(pendentes),
        fichas_ativas=fichas_ativas,
        fichas_rascunho=fichas_rascunho,
        fichas_desatualizadas=fichas_desatualizadas,
        ultimos_alunos=[
            UltimoAluno(id=a.id, nome=a.nome, professor_vinculado_em=a.professor_vinculado_em) for a in recentes],
        proximas_avaliacoes=[
            ProximaAvaliacao(
                aluno=AlunoResumo(id=aluno.id, nome=aluno.nome),
                ultima=ultima.date() if ultima else None, proxima=proxima)
            for proxima, _, aluno, ultima in proximas[:LIMITE_PROXIMAS_AVALIACOES]
        ],
    )
