export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface CadastroRequest {
  email: string;
  senha: string;
  nome: string;
  telefone: string;
  data_nascimento: string;
}

export interface CadastroResponse {
  id: number;
  email: string;
}