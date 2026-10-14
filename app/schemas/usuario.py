from pydantic import BaseModel, ConfigDict, EmailStr
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