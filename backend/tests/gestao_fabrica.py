"""Fábrica de dados para os testes de gestão (GA-02a). Hash de senha calculado uma vez (bcrypt é lento)."""
from datetime import date, datetime, timedelta
from decimal import Decimal

from app.core.seguranca import criar_hash, criar_token
from app.core.tempo import agora_naive, hoje
from app.models import (
    Acesso, Aluno, Matricula, Pagamento, Plano, Professor, Recepcionista, User,
)

HASH_SENHA = criar_hash("senha123")

TODAS_PERMISSOES = [
    "cadastrar_aluno", "editar_aluno", "aprovar_aluno", "matricular", "renovar_matricula",
    "alterar_plano", "cancelar_matricula", "registrar_pagamento", "estornar_pagamento",
    "registrar_acesso", "liberar_acesso_manual",
]


def headers(usuario: User) -> dict:
    return {"Authorization": f"Bearer {criar_token(usuario.id)}"}


def criar_user(db, email, tipo, ativo=True, criado_em="agora") -> User:
    usuario = User(
        email=email, senha=HASH_SENHA, tipo=tipo, ativo=ativo,
        criado_em=agora_naive() if criado_em == "agora" else criado_em,
    )
    db.add(usuario)
    db.flush()
    return usuario


def criar_admin(db, email="admin@gestao.com") -> User:
    usuario = criar_user(db, email, "admin")
    db.commit()
    return usuario


def criar_recepcao(db, permissoes, email="recep@gestao.com", nome="Recepção Um", ativo=True) -> tuple[User, Recepcionista]:
    usuario = criar_user(db, email, "recepcao", ativo)
    perfil = Recepcionista(user_id=usuario.id, nome=nome, telefone="11911110000", permissoes=list(permissoes))
    db.add(perfil)
    db.commit()
    return usuario, perfil


def criar_professor(db, nome="Prof Gestão", email=None, ativo=True) -> tuple[User, Professor]:
    usuario = criar_user(db, email or f"{nome.lower().replace(' ', '')}@gestao.com", "professor", ativo)
    perfil = Professor(user_id=usuario.id, nome=nome, telefone="11922220000")
    db.add(perfil)
    db.commit()
    return usuario, perfil


def criar_aluno(
    db, nome="Aluno Gestão", email=None, status="aprovado", ativo=True, professor_id=None,
    criado_em="agora", cpf=None, telefone="11933330000", restricao=None,
) -> Aluno:
    usuario = criar_user(db, email or f"{nome.lower().replace(' ', '')}@gestao.com", "aluno", ativo, criado_em)
    aluno = Aluno(
        user_id=usuario.id, nome=nome, telefone=telefone, data_nascimento=date(1995, 5, 5),
        status_cadastro=status, professor_id=professor_id, cpf=cpf, restricao_acesso=restricao,
    )
    db.add(aluno)
    db.commit()
    return aluno


def criar_plano(db, nome="Mensal", dias=30, valor="99.90", ativo=True, periodicidade="mensal") -> Plano:
    plano = Plano(nome=nome, duracao_dias=dias, valor=Decimal(valor), periodicidade=periodicidade, ativo=ativo)
    db.add(plano)
    db.commit()
    return plano


def criar_matricula(db, aluno, plano, inicio=None, status="ativa", por=None, criado_em=None, **extra) -> Matricula:
    inicio = inicio or hoje()
    matricula = Matricula(
        aluno_id=aluno.id, plano_id=plano.id, data_inicio=inicio,
        data_vencimento=inicio + timedelta(days=plano.duracao_dias - 1), valor=plano.valor, status=status,
        criado_por_user_id=por or aluno.user_id, **extra,
    )
    if criado_em:
        matricula.criado_em = criado_em
    db.add(matricula)
    db.commit()
    return matricula


def criar_pagamento(db, aluno, valor="50.00", vencimento=None, status="pendente", matricula_id=None, **extra) -> Pagamento:
    pagamento = Pagamento(
        aluno_id=aluno.id, matricula_id=matricula_id, descricao="Cobrança", valor=Decimal(valor),
        vencimento=vencimento or hoje(), status=status, **extra,
    )
    db.add(pagamento)
    db.commit()
    return pagamento


def criar_acesso(db, aluno, quando=None, resultado="liberado", por=None) -> Acesso:
    acesso = Acesso(
        aluno_id=aluno.id, data_hora=quando or agora_naive(), resultado=resultado, motivos=[],
        origem="manual", liberacao_manual=False, registrado_por_user_id=por or aluno.user_id,
    )
    db.add(acesso)
    db.commit()
    return acesso


def dias(n: int) -> date:
    """Data relativa a hoje (negativo = passado)."""
    return hoje() + timedelta(days=n)
