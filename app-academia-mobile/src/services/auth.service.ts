import { api } from './api';
import { LoginRequest, LoginResponse, CadastroRequest,} from '@/types/auth.types';

export async function login(
  dados: LoginRequest): Promise<LoginResponse> {
  const resposta = await api.post<LoginResponse>('/login', dados);

  return resposta.data;
}

export async function cadastro(
  dados: CadastroRequest) { 
    const resposta = await api.post('/cadastro', dados);

  return resposta.data;
}