import axios from 'axios';
import { createContext, useCallback, useEffect, useState } from 'react';

import { registrarSessaoExpirada } from '@/services/api';
import { login as fazerLogin } from '@/services/auth.service';
import { buscarUsuario } from '@/services/usuario.service';
import { saveToken, getToken, deleteToken } from '@/storage/secureStorage';
import { cancelarLembretes } from '@/utils/lembretes';
import { LoginRequest } from '@/types/auth.types';
import { Usuario } from '@/types/usuario.types';

interface ContextoAutenticacao {
  entrar: (dados: LoginRequest) => Promise<void>;
  sair: () => Promise<void>;
  recarregarUsuario: () => Promise<void>;
  restaurarSessao: () => Promise<void>;
  erroSessao: string | null;
  usuario: Usuario | null;
  carregando: boolean;
  estaAutenticado: boolean;
}

export const ContextoAutenticacao = createContext<ContextoAutenticacao>(
  {} as ContextoAutenticacao
);

export function ProvedorAutenticacao({
  children,
}: {
  children: React.ReactNode;
}) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroSessao, setErroSessao] = useState<string | null>(null);

  const estaAutenticado = usuario !== null;

  // Restaura a sessão ao abrir o app. Só um 401 invalida o token; falhas de
  // rede ou 5xx mantêm o token e oferecem tentar de novo (erroSessao).
  const restaurarSessao = useCallback(async () => {
    try {
      setCarregando(true);
      setErroSessao(null);

      const token = await getToken();

      if (token) {
        setUsuario(await buscarUsuario());
      }
    } catch (erro) {
      setUsuario(null);

      if (axios.isAxiosError(erro) && erro.response?.status === 401) {
        await deleteToken();
      } else {
        setErroSessao(
          'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
        );
      }
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    restaurarSessao();
  }, [restaurarSessao]);

  // 401 em qualquer rota (exceto login): o interceptor já apagou o token.
  useEffect(() => {
    registrarSessaoExpirada(() => setUsuario(null));

    return () => registrarSessaoExpirada(null);
  }, []);

  async function entrar(dados: LoginRequest) {
    setErroSessao(null);

    const resposta = await fazerLogin(dados);

    await saveToken(resposta.access_token);

    try {
      setUsuario(await buscarUsuario());
    } catch (erro) {
      await deleteToken();
      throw erro;
    }
  }

  async function sair() {
    await cancelarLembretes();
    await deleteToken();
    setUsuario(null);
  }

  const recarregarUsuario = useCallback(async () => {
    setUsuario(await buscarUsuario());
  }, []);

  return (
    <ContextoAutenticacao.Provider
      value={{
        entrar,
        sair,
        recarregarUsuario,
        restaurarSessao,
        erroSessao,
        usuario,
        carregando,
        estaAutenticado,
      }}
    >
      {children}
    </ContextoAutenticacao.Provider>
  );
}
