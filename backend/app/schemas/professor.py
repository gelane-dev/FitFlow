from pydantic import BaseModel, EmailStr

class ProfessorCriar(BaseModel):
    email: EmailStr
    senha: str
    nome: str
    telefone: str

