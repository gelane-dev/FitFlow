"""Dados de demonstração para o app (visual do redesenho, capturas de tela, demos).

    python -m app.scripts.criar_demo

Roda contra o DATABASE_URL do .env. É idempotente: pode ser executado várias vezes
e nunca apaga dados. Cria (se ainda não existirem):

- professor ``prof.demo@fitflow.com`` e aluno ``aluno.demo@fitflow.com`` (senha ``Demo@1234``);
- 8 exercícios com grupo muscular;
- uma ficha vigente para o aluno, com treinos em vários dias da semana (inclusive hoje);
- 8 sessões finalizadas nas últimas 3 semanas, com evolução de carga;
- 2 avaliações físicas.
"""
import sys
from datetime import date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..core.seguranca import criar_hash
from ..core.tempo import agora
from ..database import SessionLocal
from ..enums.dia_semana import DiaSemana
from ..models import (
    Aluno,
    AvaliacaoFisica,
    Exercicio,
    Ficha,
    HistoricoExecucao,
    ItemFicha,
    Professor,
    SessaoTreino,
    Treino,
    User,
)

SENHA_DEMO = "Demo@1234"
EMAIL_PROFESSOR = "prof.demo@fitflow.com"
EMAIL_ALUNO = "aluno.demo@fitflow.com"
NOME_FICHA = "Hipertrofia - ciclo 1"

# (nome, grupo muscular, descrição)
EXERCICIOS = [
    ("Supino reto", "Peito", "Deitado no banco, empurre a barra até estender os cotovelos."),
    ("Crucifixo inclinado", "Peito", "Abra os braços com halteres no banco inclinado."),
    ("Puxada frontal", "Costas", "Puxe a barra até a altura do queixo com as costas eretas."),
    ("Remada curvada", "Costas", "Tronco inclinado, leve a barra até o abdômen."),
    ("Agachamento livre", "Pernas", "Desça até as coxas ficarem paralelas ao chão."),
    ("Leg press 45", "Pernas", "Empurre a plataforma sem travar os joelhos."),
    ("Desenvolvimento com halteres", "Ombros", "Empurre os halteres acima da cabeça."),
    ("Rosca direta", "Bíceps", "Flexione os cotovelos mantendo-os junto ao corpo."),
]

# (nome do treino, dia fixo ou None para "hoje", [(exercício, séries, repetições, carga, descanso)])
TREINOS = [
    (
        "Treino A - Peito e ombros",
        DiaSemana.segunda,
        [
            ("Supino reto", 4, 10, 40.0, 60),
            ("Crucifixo inclinado", 3, 12, 14.0, 45),
            ("Desenvolvimento com halteres", 3, 10, 16.0, 60),
        ],
    ),
    (
        "Treino B - Costas e bíceps",
        DiaSemana.quarta,
        [
            ("Puxada frontal", 4, 10, 45.0, 60),
            ("Remada curvada", 4, 10, 35.0, 60),
            ("Rosca direta", 3, 12, 15.0, 45),
        ],
    ),
    (
        "Treino C - Pernas",
        DiaSemana.sexta,
        [
            ("Agachamento livre", 4, 10, 60.0, 90),
            ("Leg press 45", 4, 12, 120.0, 90),
        ],
    ),
    (
        "Treino D - Full body",
        None,
        [
            ("Supino reto", 3, 12, 35.0, 60),
            ("Puxada frontal", 3, 12, 40.0, 60),
            ("Agachamento livre", 3, 12, 50.0, 90),
            ("Desenvolvimento com halteres", 3, 12, 14.0, 60),
            ("Rosca direta", 3, 12, 12.0, 45),
        ],
    ),
]


def _usuario(db: Session, email: str, tipo: str) -> tuple[User, bool]:
    usuario = db.scalar(select(User).where(User.email == email))
    if usuario:
        return usuario, False
    usuario = User(email=email, senha=criar_hash(SENHA_DEMO), tipo=tipo)
    db.add(usuario)
    db.flush()
    return usuario, True


def _professor(db: Session) -> Professor:
    usuario, _ = _usuario(db, EMAIL_PROFESSOR, "professor")
    professor = db.scalar(select(Professor).where(Professor.user_id == usuario.id))
    if not professor:
        professor = Professor(user_id=usuario.id, nome="Carlos Demo", telefone="11988887777")
        db.add(professor)
        db.flush()
    return professor


def _aluno(db: Session) -> Aluno:
    usuario, _ = _usuario(db, EMAIL_ALUNO, "aluno")
    aluno = db.scalar(select(Aluno).where(Aluno.user_id == usuario.id))
    if not aluno:
        aluno = Aluno(
            user_id=usuario.id,
            nome="Ana Demo",
            telefone="11977776666",
            data_nascimento=date(1996, 4, 12),
        )
        db.add(aluno)
        db.flush()
    return aluno


def _exercicios(db: Session) -> dict[str, Exercicio]:
    resultado: dict[str, Exercicio] = {}
    for nome, grupo, descricao in EXERCICIOS:
        exercicio = db.scalar(select(Exercicio).where(Exercicio.nome == nome, Exercicio.ativo.is_(True)))
        if not exercicio:
            exercicio = Exercicio(nome=nome, grupo_muscular=grupo, descricao=descricao, ativo=True)
            db.add(exercicio)
            db.flush()
        resultado[nome] = exercicio
    return resultado


def _ficha(db: Session, aluno: Aluno, professor: Professor, exercicios: dict[str, Exercicio]):
    """Devolve (ficha, treinos criados agora?)."""
    ficha = db.scalar(
        select(Ficha).where(Ficha.aluno_id == aluno.id, Ficha.nome == NOME_FICHA, Ficha.ativo.is_(True))
    )
    if ficha:
        return ficha, False

    momento = agora().replace(tzinfo=None)
    hoje = momento.date()
    ficha = Ficha(
        aluno_id=aluno.id,
        professor_id=professor.id,
        nome=NOME_FICHA,
        data_criacao=momento - timedelta(days=28),
        data_inicio=hoje - timedelta(days=28),
        data_fim=hoje + timedelta(days=60),
        ativo=True,
    )
    db.add(ficha)
    db.flush()

    dia_hoje = list(DiaSemana)[hoje.weekday()]
    dias_fixos = {dia for _, dia, _ in TREINOS if dia is not None}

    for ordem, (nome, dia, itens) in enumerate(TREINOS, start=1):
        if dia is None:
            # O treino "livre" cai hoje; se hoje já tem treino fixo, usa o sábado.
            dia = dia_hoje if dia_hoje not in dias_fixos else DiaSemana.sabado
        treino = Treino(ficha_id=ficha.id, nome=nome, dia_semana=dia.value, ordem=ordem, ativo=True)
        db.add(treino)
        db.flush()
        for ordem_item, (exercicio, series, repeticoes, carga, descanso) in enumerate(itens, start=1):
            db.add(
                ItemFicha(
                    ficha_id=ficha.id,
                    treino_id=treino.id,
                    exercicio_id=exercicios[exercicio].id,
                    series=series,
                    repeticoes=repeticoes,
                    carga=carga,
                    descanso=descanso,
                    ordem=ordem_item,
                    ativo=True,
                )
            )
    db.flush()
    return ficha, True


def _sessoes(db: Session, aluno: Aluno, ficha: Ficha) -> int:
    if db.scalar(select(func.count(SessaoTreino.id)).where(SessaoTreino.aluno_id == aluno.id)):
        return 0

    treinos = db.scalars(select(Treino).where(Treino.ficha_id == ficha.id).order_by(Treino.ordem)).all()
    hoje = agora().replace(tzinfo=None).date()
    # 8 sessões: a cada ~2,5 dias, da mais antiga (21 dias atrás) até 1 dia atrás.
    dias_atras = [21, 19, 16, 14, 11, 8, 5, 2]
    comentarios = ["Bom treino", "Senti o peso mais leve", None, "Cansada hoje", None, "Evoluí na carga", None, "Ótimo!"]

    for numero, atras in enumerate(dias_atras):
        treino = treinos[numero % len(treinos)]
        inicio = datetime.combine(hoje - timedelta(days=atras), time(18, 30))
        sessao = SessaoTreino(
            aluno_id=aluno.id,
            treino_id=treino.id,
            iniciada_em=inicio,
            finalizada_em=inicio + timedelta(minutes=55),
            esforco=6 + (numero % 4),
            comentario=comentarios[numero],
        )
        db.add(sessao)
        db.flush()

        itens = db.scalars(
            select(ItemFicha).where(ItemFicha.treino_id == treino.id, ItemFicha.ativo.is_(True)).order_by(ItemFicha.ordem)
        ).all()
        # Evolução de carga: +2,5% por rodada do ciclo (arredondado em 0,5 kg).
        rodada = numero // len(treinos)
        for item in itens:
            carga = round(item.carga * (0.9 + 0.05 * rodada + 0.02 * numero) * 2) / 2
            for serie in range(1, item.series + 1):
                db.add(
                    HistoricoExecucao(
                        item_ficha_id=item.id,
                        aluno_id=aluno.id,
                        sessao_id=sessao.id,
                        data_execucao=inicio + timedelta(minutes=5 + serie * 3),
                        series_realizadas=1,
                        repeticoes_realizadas=item.repeticoes,
                        carga_utilizada=carga,
                    )
                )
    return len(dias_atras)


def _avaliacoes(db: Session, aluno: Aluno, professor: Professor) -> int:
    if db.scalar(select(func.count(AvaliacaoFisica.id)).where(AvaliacaoFisica.aluno_id == aluno.id)):
        return 0

    hoje = agora().replace(tzinfo=None)
    db.add_all(
        [
            AvaliacaoFisica(
                aluno_id=aluno.id,
                professor_id=professor.id,
                data_avaliacao=hoje - timedelta(days=28),
                peso=68.4,
                altura=1.68,
                percentual_gordura=26.5,
                massa_muscular=47.2,
                observacao="Avaliação inicial.",
            ),
            AvaliacaoFisica(
                aluno_id=aluno.id,
                professor_id=professor.id,
                data_avaliacao=hoje - timedelta(days=1),
                peso=66.9,
                altura=1.68,
                percentual_gordura=24.8,
                massa_muscular=48.1,
                observacao="Boa evolução no mês.",
            ),
        ]
    )
    return 2


def criar_demo(db: Session) -> dict[str, int]:
    professor = _professor(db)
    aluno = _aluno(db)
    exercicios = _exercicios(db)
    ficha, ficha_nova = _ficha(db, aluno, professor, exercicios)
    sessoes = _sessoes(db, aluno, ficha)
    avaliacoes = _avaliacoes(db, aluno, professor)
    db.commit()

    return {"ficha_criada": int(ficha_nova), "sessoes": sessoes, "avaliacoes": avaliacoes}


def main() -> int:
    with SessionLocal() as db:
        resumo = criar_demo(db)

    print("Dados de demonstração prontos.")
    print(f"  Professor: {EMAIL_PROFESSOR} / {SENHA_DEMO}")
    print(f"  Aluno:     {EMAIL_ALUNO} / {SENHA_DEMO}")
    print(
        f"  Criados agora: ficha={resumo['ficha_criada']}, "
        f"sessões={resumo['sessoes']}, avaliações={resumo['avaliacoes']}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
