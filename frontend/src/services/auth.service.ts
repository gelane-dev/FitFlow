import { api } from './api';
import { LoginRequest, LoginResponse, CadastroRequest,} from '@/types/auth.types';

/** Sem resposta em 15 s o login falha com mensagem, em vez de ficar "ocupado" para sempre (P-02). */
export const TIMEOUT_LOGIN_MS = 15000;

export async function login(
  dados: LoginRequest): Promise<LoginResponse> {
  const resposta = await api.post<LoginResponse>('/login', dados, {
    timeout: TIMEOUT_LOGIN_MS,
  });

  return resposta.data;
}

export async function cadastro(
  dados: CadastroRequest) { 
    const resposta = await api.post('/cadastro', dados);

  return resposta.data;
}