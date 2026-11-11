from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from ..core.tempo import DataHoraLocal
from .auditoria import AuditoriaItem
from .gestao import ResumoNome

Permissao = Literal[
    "cadastrar_aluno", "editar_aluno", "aprovar_aluno", "matricular", "renovar_matricula",
    "alterar_plano", "cancelar_matricula", "registrar_pagamento", "estornar_pagamento",
    "registrar_acesso", "liberar_acesso_manual",
]


class ProfessorItem(BaseModel):
    id: int
    nome: str
    email: str
    telefone: str
    foto: str | None = None
    ativo: bool
    criado_em: DataHoraLocal | None = None
    total_alunos: int
    total_fichas: int
    total_avaliacoes: int


class AlunoDoProfessor(BaseModel):
    id: int
    nome: str
    telefone: str
    ativo: bool
    status_cadastro: str
    professor_vinculado_em: DataHoraLocal | None = None


class FichaDoProfessor(BaseModel):
    id: int
    nome: str
    aluno: ResumoNome
    status: str
    atualizado_em: DataHoraLocal | None = None


class AvaliacaoDoProfessor(BaseModel):
    id: int
    aluno: ResumoNome
    data_avaliacao: DataHoraLocal
    peso: float
    altura: float


class ProfessorDetalhe(ProfessorItem):
    alunos: list[AlunoDoProfessor]
    fichas: list[FichaDoProfessor]
    avaliacoes_recentes: list[AvaliacaoDoProfessor]
    atividade: list[AuditoriaItem]


class ProfessorAtualizar(BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    telefone: str = Field(min_length=1, max_length=20)
    email: EmailStr


class TransferirAlunos(BaseModel):
    destino_professor_id: int | None = None
    aluno_ids: list[int] | None = None


class RecepcionistaCriar(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=6)
    nome: str = Field(min_length=1, max_length=150)
    telefone: str = Field(min_length=1, max_length=20)
    permissoes: list[Permissao] | None = None


class RecepcionistaAtualizar(BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    telefone: str = Field(min_length=1, max_length=20)
    email: EmailStr


class PermissoesAtualizar(BaseModel):
    permissoes: list[Permissao]


class RecepcionistaItem(BaseModel):
    id: int
    user_id: int
    nome: str
    email: str
    telefone: str
    ativo: bool
    permissoes: list[str]
    criado_em: DataHoraLocal | None = None


class RecepcionistaDetalhe(RecepcionistaItem):
    atividade: list[AuditoriaItem]
