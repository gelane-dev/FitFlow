from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import date

class UsuarioBase(BaseModel):
    email: EmailStr

class UsuarioCriar(UsuarioBase):
    senha: str
    nome: str
    telefone: str
    data_nascimento: date

class UsuarioResposta(UsuarioBase):
    id: int
    tipo: str
    foto: str | None = None
    ativo: bool = True

    model_config = ConfigDict(from_attributes=True)

class UsuarioLogin(BaseModel):
    email: EmailStr
    senha: str

class AlunoAtualizar(BaseModel):
    nome: str
    telefone: str
    data_nascimento: date

class AlunoResposta(BaseModel):
    id: int
    nome: str
    telefone: str
    data_nascimento: date

    model_config = ConfigDict(from_attributes=True)

class ProfessorAtualizar(BaseModel):
    nome: str
    telefone: str

class ProfessorResposta(BaseModel):
    id: int
    nome: str
    telefone: str

class EmailAtualizar(BaseModel):
    email: EmailStr

class SenhaAtualizar(BaseModel):
    senha_atual: str
    nova_senha: str


class RecepcionistaPerfilAtualizar(BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    telefone: str = Field(min_length=1, max_length=20)


class RecepcionistaPerfilResposta(BaseModel):
    id: int
    nome: str
    telefone: str
    permissoes: list[str] = []

    model_config = ConfigDict(from_attributes=True)
