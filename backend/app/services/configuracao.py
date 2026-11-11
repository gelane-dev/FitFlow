from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import ConfiguracaoAcademia

ID_CONFIGURACAO = 1


def obter_configuracao(db: Session) -> ConfiguracaoAcademia:
    """Linha única da academia (id=1, criada pela migração). Se faltar, cria com os padrões."""

    configuracao = db.scalar(select(ConfiguracaoAcademia).where(ConfiguracaoAcademia.id == ID_CONFIGURACAO))

    if not configuracao:
        configuracao = ConfiguracaoAcademia(
            id=ID_CONFIGURACAO, nome="FitFlow", horarios=[],
            tolerancia_dias_vencimento=0, bloquear_pagamento_pendente=False,
            dias_alerta_vencimento=7, dias_reavaliacao=90, dias_atualizar_treino=60,
        )
        db.add(configuracao)
        db.flush()

    return configuracao
