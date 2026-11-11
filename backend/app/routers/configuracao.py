from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.seguranca import obter_usuario_atual, verificar_admin
from ..core.tempo import agora_naive
from ..database import get_db
from ..schemas.configuracao import ConfiguracaoAtualizar, ConfiguracaoPublicaResposta, ConfiguracaoResposta
from ..services import auditoria
from ..services.configuracao import obter_configuracao

router = APIRouter()


@router.get("/configuracao", response_model=ConfiguracaoPublicaResposta)
def obter_configuracao_publica(usuario=Depends(obter_usuario_atual), db: Session = Depends(get_db)):

    return obter_configuracao(db)


@router.get("/admin/configuracao", response_model=ConfiguracaoResposta)
def obter_configuracao_admin(admin=Depends(verificar_admin), db: Session = Depends(get_db)):

    return obter_configuracao(db)


@router.put("/admin/configuracao", response_model=ConfiguracaoResposta)
def atualizar_configuracao(dados: ConfiguracaoAtualizar, admin=Depends(verificar_admin), db: Session = Depends(get_db)):

    configuracao = obter_configuracao(db)

    for campo, valor in dados.model_dump(mode="json").items():
        setattr(configuracao, campo, valor)

    configuracao.atualizado_em = agora_naive()

    auditoria.registrar(db, admin, "configuracao.editar", "configuracao", configuracao.id, "Configurações da academia editadas")

    db.commit()
    db.refresh(configuracao)

    return configuracao
