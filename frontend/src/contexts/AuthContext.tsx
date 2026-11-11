import axios from 'axios';
import { createContext, useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { registrarSessaoExpirada } from '@/services/api';
import { login as fazerLogin, logout as encerrarSessaoNoServidor } from '@/services/auth.service';
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
  /** Motivo do logout forçado pelo servidor (ex.: "Conta desativada"); a tela de login o mostra. */
  avisoLogin: string | null;
  usuario: Usuario | null;
  carregando: boolean;
  estaAutenticado: boolean;
}

/** `detail` do 401 quando um admin desativa a conta de quem está logado (Contrato-Gestao.md). */
const MOTIVO_CONTA_DESATIVADA = 'Conta desativada';

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
  const [avisoLogin, setAvisoLogin] = useState<string | null>(null);

  const estaAutenticado = usuario !== null;

  // Restaura a sessão ao abrir o app. Só um 401 invalida o token; falhas de
  // rede ou 5xx mantêm o token e oferecem tentar de novo (erroSessao).
  const restaurarSessao = useCallback(async () => {
    try {
      setCarregando(true);
      setErroSessao(null);

      // Web: a sessão é o cookie, então sempre pergunta ao servidor (GET /perfil, 401 = sem sessão).
      // Mobile: só pergunta se há token salvo.
      const token = await getToken();

      if (Platform.OS === 'web' || token) {
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
    registrarSessaoExpirada((motivo) => {
      setUsuario(null);
      setAvisoLogin(motivo === MOTIVO_CONTA_DESATIVADA ? motivo : null);
    });

    return () => registrarSessaoExpirada(null);
  }, []);

  async function entrar(dados: LoginRequest) {
    setErroSessao(null);
    setAvisoLogin(null);

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

    if (Platform.OS === 'web') {
      try {
        await encerrarSessaoNoServidor();
      } catch {
        // Sem rede ou sessão já expirada: o app sai mesmo assim.
      }
    }

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
        avisoLogin,
        usuario,
        carregando,
        estaAutenticado,
      }}
    >
      {children}
    </ContextoAutenticacao.Provider>
  );
}
