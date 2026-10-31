import axios from 'axios';

import { deleteToken, getToken } from '@/storage/secureStorage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  async (config) => {
    const token = await getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
);

type CallbackSessaoExpirada = () => void;

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
      aoSessaoExpirada?.();
    }

    return Promise.reject(erro);
  },
);
