"""Controle de entrada: avaliação de acesso (todos os motivos de bloqueio) e registro."""
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..core.tempo import agora_naive, hoje
from ..models import Acesso, Aluno, Matricula, Pagamento, Plano, User
from . import auditoria
from .configuracao import obter_configuracao
from .equipe import nomes_usuarios, usuario_tem_permissao
from .matriculas import calcular_situacao, matriculas_ativas, vencida_alem_da_tolerancia

MENSAGENS = {
    "conta_desativada": "Conta desativada",
    "cadastro_pendente": "Cadastro não aprovado",
    "restricao": "Restrição de acesso",
    "sem_matricula": "Sem matrícula ativa",
    "matricula_vencida": "Matrícula vencida",
    "pagamento_pendente": "Pagamento pendente",
}


def mensagem_motivo(codigo: str, aluno: Aluno | None = None, matricula: Matricula | None = None) -> str:
    """Mensagem do contrato; com os dados do aluno/matrícula inclui restrição e data de vencimento."""
    if codigo == "restricao" and aluno is not None and aluno.restricao_acesso:
        return f"Restrição: {aluno.restricao_acesso}"
    if codigo == "matricula_vencida" and matricula is not None:
        return f"Matrícula vencida em {matricula.data_vencimento.strftime('%d/%m/%Y')}"
    return MENSAGENS.get(codigo, codigo)


def obter_matricula_ativa(db: Session, aluno_id: int) -> tuple[Matricula, Plano] | None:
    linha = db.execute(
        select(Matricula, Plano).join(Plano, Plano.id == Matricula.plano_id)
        .where(Matricula.aluno_id == aluno_id, Matricula.status == "ativa")
    ).first()
    return (linha[0], linha[1]) if linha else None


def avaliar_acesso(db: Session, aluno: Aluno) -> dict:
    """Reavaliado no servidor a cada entrada: {autorizado, motivos: [códigos]}."""
    configuracao = obter_configuracao(db)
    referencia = hoje()
    motivos: list[str] = []

    if not aluno.user.ativo:
        motivos.append("conta_desativada")
    if aluno.status_cadastro != "aprovado":
        motivos.append("cadastro_pendente")
    if aluno.restricao_acesso:
        motivos.append("restricao")

    ativa = obter_matricula_ativa(db, aluno.id)
    if not ativa:
        motivos.append("sem_matricula")
    else:
        if vencida_alem_da_tolerancia(ativa[0], referencia, configuracao.tolerancia_dias_vencimento):
            motivos.append("matricula_vencida")

    if configuracao.bloquear_pagamento_pendente:
        pendente_vencido = db.scalar(
            select(Pagamento.id).where(
                Pagamento.aluno_id == aluno.id, Pagamento.status == "pendente", Pagamento.vencimento < referencia
            ).limit(1)
        )
        if pendente_vencido:
            motivos.append("pagamento_pendente")

    return {"autorizado": not motivos, "motivos": motivos}


def motivos_detalhados(db: Session, aluno: Aluno, codigos: list[str]) -> list[dict]:
    ativa = obter_matricula_ativa(db, aluno.id) if "matricula_vencida" in codigos else None
    matricula = ativa[0] if ativa else None
    return [{"codigo": c, "mensagem": mensagem_motivo(c, aluno, matricula)} for c in codigos]


def localizar_aluno(db: Session, aluno_id: int | None, codigo: str | None) -> Aluno:
    if aluno_id is None and not codigo:
        raise HTTPException(status_code=422, detail="Informe aluno_id ou codigo")

    consulta = select(Aluno).where(Aluno.id == aluno_id) if aluno_id is not None else select(Aluno).where(Aluno.codigo_acesso == codigo)
    aluno = db.scalar(consulta)

    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    return aluno


def pendencias(db: Session, aluno_id: int) -> dict:
    quantidade, total = db.execute(
        select(func.count(Pagamento.id), func.coalesce(func.sum(Pagamento.valor), 0)).where(
            Pagamento.aluno_id == aluno_id, Pagamento.status == "pendente"
        )
    ).one()
    return {"quantidade": quantidade, "valor_total": Decimal(str(total)).quantize(Decimal("0.01"))}


def ultimas_entradas(db: Session, aluno_id: int, limite: int = 5) -> list[Acesso]:
    return list(db.scalars(
        select(Acesso).where(Acesso.aluno_id == aluno_id, Acesso.resultado == "liberado")
        .order_by(Acesso.data_hora.desc(), Acesso.id.desc()).limit(limite)
    ).all())


def verificar(db: Session, aluno: Aluno) -> dict:
    """Resposta de GET /acessos/verificar."""
    avaliacao = avaliar_acesso(db, aluno)
    ativa = obter_matricula_ativa(db, aluno.id)
    configuracao = obter_configuracao(db)

    matricula = None
    if ativa:
        matricula = {
            "plano": ativa[1].nome,
            "data_vencimento": ativa[0].data_vencimento,
            "situacao": calcular_situacao(ativa[0], hoje(), configuracao.dias_alerta_vencimento),
        }

    return {
        "aluno": {
            "id": aluno.id, "nome": aluno.nome, "foto": aluno.user.foto,
            "status_cadastro": aluno.status_cadastro, "ativo": aluno.user.ativo,
        },
        "autorizado": avaliacao["autorizado"],
        "motivos": motivos_detalhados(db, aluno, avaliacao["motivos"]),
        "matricula": matricula,
        "pendencias": pendencias(db, aluno.id),
        "ultimas_entradas": ultimas_entradas(db, aluno.id),
    }


def registrar_entrada(
    db: Session, usuario: User, aluno: Aluno, origem: str, forcar: bool,
) -> Acesso:
    """Grava a tentativa (sempre reavaliada no servidor). Bloqueada fica no histórico como `bloqueado`."""
    if forcar and not usuario_tem_permissao(db, usuario, "liberar_acesso_manual"):
        raise HTTPException(status_code=403, detail="Permissão insuficiente")

    avaliacao = avaliar_acesso(db, aluno)
    manual = forcar and not avaliacao["autorizado"]
    liberado = avaliacao["autorizado"] or manual

    acesso = Acesso(
        aluno_id=aluno.id, data_hora=agora_naive(),
        resultado="liberado" if liberado else "bloqueado",
        motivos=avaliacao["motivos"], origem=origem, liberacao_manual=manual,
        registrado_por_user_id=usuario.id,
    )
    db.add(acesso)
    db.flush()

    if manual:
        auditoria.registrar(
            db, usuario, "acesso.liberado_manual", "acesso", acesso.id,
            f"Entrada de {aluno.nome} liberada manualmente",
            {"aluno_id": aluno.id, "motivos": avaliacao["motivos"]},
        )

    return acesso


def montar_itens_acesso(db: Session, linhas: list[tuple[Acesso, Aluno]]) -> list[dict]:
    """Itens de listagem de acessos (AcessoResposta) com consultas em lote; motivos com os mesmos
    textos detalhados de /acessos/verificar (restrição e data de vencimento)."""
    nomes = nomes_usuarios(db, {acesso.registrado_por_user_id for acesso, _ in linhas})
    fotos = {
        u.id: u.foto for u in db.scalars(select(User).where(User.id.in_({aluno.user_id for _, aluno in linhas}))).all()
    } if linhas else {}
    vencidos = {aluno.id for acesso, aluno in linhas if "matricula_vencida" in (acesso.motivos or [])}
    ativas = matriculas_ativas(db, list(vencidos))

    return [{
        "id": acesso.id,
        "aluno": {"id": aluno.id, "nome": aluno.nome, "foto": fotos.get(aluno.user_id)},
        "data_hora": acesso.data_hora, "resultado": acesso.resultado,
        "motivos": [
            {"codigo": c, "mensagem": mensagem_motivo(c, aluno, ativas[aluno.id][0] if aluno.id in ativas else None)}
            for c in (acesso.motivos or [])
        ],
        "origem": acesso.origem, "liberacao_manual": acesso.liberacao_manual,
        "registrado_por": nomes.get(acesso.registrado_por_user_id),
    } for acesso, aluno in linhas]
