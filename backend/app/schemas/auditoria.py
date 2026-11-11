from pydantic import BaseModel

from ..core.tempo import DataHoraLocal


class UsuarioAuditoria(BaseModel):
    id: int
    nome: str
    tipo: str


class AuditoriaItem(BaseModel):
    id: int
    data_hora: DataHoraLocal
    acao: str
    entidade: str
    entidade_id: int | None = None
    descricao: str
    detalhes: dict | None = None
    usuario: UsuarioAuditoria | None = None
