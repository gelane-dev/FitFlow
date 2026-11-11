import axios from 'axios';
import { Platform } from 'react-native';

import { deleteToken, getToken } from '@/storage/secureStorage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  async (config) => {
    // Web (ADR-034): sessão por cookie HttpOnly. O header força o preflight de CORS (proteção CSRF).
    if (Platform.OS === 'web') {
      config.withCredentials = true;
      config.headers['X-FitFlow-Client'] = 'web';

      return config;
    }

    const token = await getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
);

/** Recebe o `detail` do 401 (ex.: "Conta desativada"), para a tela de login explicar o motivo. */
type CallbackSessaoExpirada = (motivo?: string) => void;

let aoSessaoExpirada: CallbackSessaoExpirada | null = null;

/** Registrado pelo AuthContext; evita import circular entre api e contexto. */
export function registrarSessaoExpirada(callback: CallbackSessaoExpirada | null) {
  aoSessaoExpirada = callback;
}

api.interceptors.response.use(
  (resposta) => resposta,
  async (erro) => {
    const requisicao = erro.config;
    // 401 esperado: login com credenciais erradas e troca de senha com senha
    // atual errada (um token expirado em /perfil/senha continua deslogando).
    const ehErroDeCredencial =
      (requisicao?.url === '/login' && requisicao?.method === 'post') ||
      (requisicao?.url === '/perfil/senha' &&
        requisicao?.method === 'put' &&
        erro.response?.data?.detail === 'Senha atual incorreta');

    if (
      axios.isAxiosError(erro) &&
      erro.response?.status === 401 &&
      !ehErroDeCredencial
    ) {
      await deleteToken();
      aoSessaoExpirada?.(erro.response?.data?.detail);
    }

    return Promise.reject(erro);
  },
);
