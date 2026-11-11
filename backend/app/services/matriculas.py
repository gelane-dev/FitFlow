"""Matrículas: situação calculada (um lugar só), vencimento, renovação, troca de plano e cancelamento."""
from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy import and_, not_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..core.tempo import agora_naive, hoje
from ..models import Aluno, Matricula, Pagamento, Plano, User
from . import auditoria
from .configuracao import obter_configuracao

LIMITE_DIAS_PASSADO = 30

SITUACOES_ALUNO = ("vigente", "vencendo", "vencida", "sem_matricula", "pendente", "desativado", "inadimplente")


def calcular_vencimento(data_inicio: date, duracao_dias: int) -> date:
    """data_vencimento = data_inicio + duracao_dias - 1."""
    return data_inicio + timedelta(days=duracao_dias - 1)


def calcular_situacao(matricula: Matricula | None, referencia: date, dias_alerta: int) -> str:
    """Situação da matrícula (nunca gravada): vigente | vencendo | vencida | sem_matricula."""
    if matricula is None or matricula.status != "ativa":
        return "sem_matricula"
    if matricula.data_vencimento < referencia:
        return "vencida"
    if matricula.data_vencimento <= referencia + timedelta(days=dias_alerta):
        return "vencendo"
    return "vigente"


# ---------- expressões SQL equivalentes (listagens e painéis) ----------

def _ativa_com(*condicoes):
    return select(Matricula.id).where(
        Matricula.aluno_id == Aluno.id, Matricula.status == "ativa", *condicoes
    ).exists()


def condicao_inadimplente():
    """Aluno com pagamento pendente e vencimento anterior a hoje."""
    return select(Pagamento.id).where(
        Pagamento.aluno_id == Aluno.id, Pagamento.status == "pendente", Pagamento.vencimento < hoje()
    ).exists()


def condicao_com_pendencia():
    """Aluno com qualquer pagamento pendente."""
    return select(Pagamento.id).where(Pagamento.aluno_id == Aluno.id, Pagamento.status == "pendente").exists()


def _condicoes_situacao(situacao: str, referencia: date, dias_alerta: int) -> list:
    """Condições sobre Matricula (além de status "ativa") equivalentes a `calcular_situacao`."""
    limite = referencia + timedelta(days=dias_alerta)

    if situacao == "vigente":
        return [Matricula.data_vencimento > limite]
    if situacao == "vencendo":
        return [Matricula.data_vencimento >= referencia, Matricula.data_vencimento <= limite]
    if situacao == "vencida":
        return [Matricula.data_vencimento < referencia]
    raise ValueError(situacao)


def filtro_situacao_matricula(situacao: str, referencia: date, dias_alerta: int):
    """Condição sobre Matricula: ativa e na situação vigente | vencendo | vencida."""
    return and_(Matricula.status == "ativa", *_condicoes_situacao(situacao, referencia, dias_alerta))


def filtro_situacao(situacao: str, referencia: date, dias_alerta: int):
    """Condição sobre Aluno (com User na consulta) equivalente a `calcular_situacao` + flags."""
    if situacao in ("vigente", "vencendo", "vencida"):
        return _ativa_com(*_condicoes_situacao(situacao, referencia, dias_alerta))
    if situacao == "sem_matricula":
        return not_(_ativa_com())
    if situacao == "pendente":
        return Aluno.status_cadastro == "pendente"
    if situacao == "desativado":
        return User.ativo.is_(False)
    if situacao == "inadimplente":
        return condicao_inadimplente()
    raise ValueError(situacao)


def condicao_aluno_habilitado():
    """Conta ativa e cadastro aprovado (com User na consulta)."""
    return and_(User.ativo.is_(True), Aluno.status_cadastro == "aprovado")


def condicao_aluno_ativo(referencia: date):
    """Aluno "ativo": habilitado e com matrícula vigente (inclui vencendo; sem tolerância)."""
    return and_(condicao_aluno_habilitado(), _ativa_com(Matricula.data_vencimento >= referencia))


def dias_de_atraso(matricula: Matricula, referencia: date) -> int:
    """Dias desde o vencimento (negativo se ainda não venceu)."""
    return (referencia - matricula.data_vencimento).days


def vencida_alem_da_tolerancia(matricula: Matricula, referencia: date, tolerancia_dias: int) -> bool:
    """Matrícula vencida há mais dias que a tolerância configurada (regra do controle de entrada)."""
    return dias_de_atraso(matricula, referencia) > tolerancia_dias


# ---------- leitura em lote (sem N+1) ----------

def matriculas_ativas(db: Session, aluno_ids: list[int]) -> dict[int, tuple[Matricula, Plano]]:
    if not aluno_ids:
        return {}
    linhas = db.execute(
        select(Matricula, Plano).join(Plano, Plano.id == Matricula.plano_id)
        .where(Matricula.aluno_id.in_(aluno_ids), Matricula.status == "ativa")
    ).all()
    return {m.aluno_id: (m, p) for m, p in linhas}


def alunos_inadimplentes(db: Session, aluno_ids: list[int]) -> set[int]:
    if not aluno_ids:
        return set()
    return set(db.scalars(
        select(Pagamento.aluno_id).where(
            Pagamento.aluno_id.in_(aluno_ids), Pagamento.status == "pendente", Pagamento.vencimento < hoje()
        ).distinct()
    ).all())


def resumo_matricula(matricula: Matricula, plano: Plano, referencia: date, dias_alerta: int) -> dict:
    return {
        "id": matricula.id,
        "plano": {"id": plano.id, "nome": plano.nome},
        "data_inicio": matricula.data_inicio,
        "data_vencimento": matricula.data_vencimento,
        "valor": matricula.valor,
        "situacao": calcular_situacao(matricula, referencia, dias_alerta),
    }


def resposta_matricula(matricula: Matricula, aluno: Aluno, plano: Plano, referencia, alerta: int) -> dict:
    return {
        "id": matricula.id,
        "aluno": {"id": aluno.id, "nome": aluno.nome},
        "plano": {"id": plano.id, "nome": plano.nome},
        "data_inicio": matricula.data_inicio,
        "data_vencimento": matricula.data_vencimento,
        "valor": matricula.valor,
        "status": matricula.status,
        "situacao": calcular_situacao(matricula, referencia, alerta) if matricula.status == "ativa" else None,
        "motivo_cancelamento": matricula.motivo_cancelamento,
        "cancelada_em": matricula.cancelada_em,
        "matricula_anterior_id": matricula.matricula_anterior_id,
        "criado_em": matricula.criado_em,
    }


def dias_alerta_vencimento(db: Session) -> int:
    return obter_configuracao(db).dias_alerta_vencimento


# ---------- operações ----------

def _obter_plano_ativo(db: Session, plano_id: int) -> Plano:
    plano = db.get(Plano, plano_id)
    if not plano:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    if not plano.ativo:
        raise HTTPException(status_code=422, detail="Plano inativo")
    return plano


def obter_matricula(db: Session, matricula_id: int, travar: bool = False) -> Matricula:
    """`travar` lê com FOR UPDATE (cancelamentos/renovações simultâneos não se atropelam)."""
    matricula = db.get(Matricula, matricula_id, with_for_update=travar or None)
    if not matricula:
        raise HTTPException(status_code=404, detail="Matrícula não encontrada")
    return matricula


def _exigir_ativa(matricula: Matricula) -> None:
    if matricula.status != "ativa":
        raise HTTPException(status_code=409, detail="Matrícula não está ativa")


def _criar_matricula_e_cobranca(
    db: Session, usuario: User, aluno: Aluno, plano: Plano, data_inicio: date,
    descricao: str, anterior: Matricula | None,
) -> Matricula:
    matricula = Matricula(
        aluno_id=aluno.id, plano_id=plano.id, data_inicio=data_inicio,
        data_vencimento=calcular_vencimento(data_inicio, plano.duracao_dias),
        valor=plano.valor, status="ativa", criado_por_user_id=usuario.id,
        matricula_anterior_id=anterior.id if anterior else None,
    )
    db.add(matricula)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Aluno já possui matrícula ativa")

    db.add(Pagamento(
        aluno_id=aluno.id, matricula_id=matricula.id, descricao=f"{descricao} — {plano.nome}"[:150],
        valor=plano.valor, vencimento=data_inicio, status="pendente",
    ))
    db.flush()
    return matricula


def _cancelar_pendentes(db: Session, matricula: Matricula) -> int:
    pendentes = db.scalars(
        select(Pagamento).where(Pagamento.matricula_id == matricula.id, Pagamento.status == "pendente")
    ).all()
    for pagamento in pendentes:
        pagamento.status = "cancelado"
    return len(pendentes)


def matricular(db: Session, usuario: User, aluno_id: int, plano_id: int, data_inicio: date | None) -> Matricula:
    aluno = db.get(Aluno, aluno_id)
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    plano = _obter_plano_ativo(db, plano_id)

    if aluno.status_cadastro != "aprovado":
        raise HTTPException(status_code=422, detail="Cadastro do aluno não aprovado")
    if not aluno.user.ativo:
        raise HTTPException(status_code=422, detail="Conta do aluno desativada")

    referencia = hoje()
    inicio = data_inicio or referencia
    if inicio < referencia - timedelta(days=LIMITE_DIAS_PASSADO):
        raise HTTPException(status_code=422, detail="Data de início não pode ser anterior a 30 dias")

    if db.scalar(select(Matricula.id).where(Matricula.aluno_id == aluno.id, Matricula.status == "ativa")):
        raise HTTPException(status_code=409, detail="Aluno já possui matrícula ativa")

    matricula = _criar_matricula_e_cobranca(db, usuario, aluno, plano, inicio, "Matrícula", None)
    auditoria.registrar(
        db, usuario, "matricula.criar", "matricula", matricula.id,
        f"Matrícula de {aluno.nome} no plano {plano.nome}",
        {"aluno_id": aluno.id, "plano_id": plano.id, "data_inicio": inicio.isoformat()},
    )
    return matricula


def renovar(db: Session, usuario: User, matricula_id: int, plano_id: int | None) -> Matricula:
    atual = obter_matricula(db, matricula_id)
    _exigir_ativa(atual)
    plano = _obter_plano_ativo(db, plano_id or atual.plano_id)
    aluno = db.get(Aluno, atual.aluno_id)

    inicio = max(hoje(), atual.data_vencimento + timedelta(days=1))

    atual.status = "encerrada"
    db.flush()  # libera o índice único de matrícula ativa antes de inserir a nova

    nova = _criar_matricula_e_cobranca(db, usuario, aluno, plano, inicio, "Renovação", atual)
    auditoria.registrar(
        db, usuario, "matricula.renovar", "matricula", nova.id,
        f"Matrícula de {aluno.nome} renovada no plano {plano.nome}",
        {"aluno_id": aluno.id, "anterior_id": atual.id, "plano_id": plano.id, "data_inicio": inicio.isoformat()},
    )
    return nova


def alterar_plano(db: Session, usuario: User, matricula_id: int, plano_id: int) -> Matricula:
    atual = obter_matricula(db, matricula_id)
    _exigir_ativa(atual)
    if plano_id == atual.plano_id:
        raise HTTPException(status_code=422, detail="Escolha um plano diferente do atual")
    plano = _obter_plano_ativo(db, plano_id)
    aluno = db.get(Aluno, atual.aluno_id)

    atual.status = "substituida"
    canceladas = _cancelar_pendentes(db, atual)
    db.flush()

    nova = _criar_matricula_e_cobranca(db, usuario, aluno, plano, hoje(), "Troca de plano", atual)
    auditoria.registrar(
        db, usuario, "matricula.alterar_plano", "matricula", nova.id,
        f"Plano de {aluno.nome} alterado para {plano.nome}",
        {"aluno_id": aluno.id, "anterior_id": atual.id, "plano_anterior_id": atual.plano_id,
         "plano_id": plano.id, "pagamentos_cancelados": canceladas},
    )
    return nova


def cancelar(db: Session, usuario: User, matricula_id: int, motivo: str) -> Matricula:
    matricula = obter_matricula(db, matricula_id, travar=True)
    _exigir_ativa(matricula)
    aluno = db.get(Aluno, matricula.aluno_id)

    matricula.status = "cancelada"
    matricula.motivo_cancelamento = motivo
    matricula.cancelada_em = agora_naive()
    canceladas = _cancelar_pendentes(db, matricula)

    auditoria.registrar(
        db, usuario, "matricula.cancelar", "matricula", matricula.id,
        f"Matrícula de {aluno.nome} cancelada",
        {"aluno_id": aluno.id, "motivo": motivo, "pagamentos_cancelados": canceladas},
    )
    return matricula
