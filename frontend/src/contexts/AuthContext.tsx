import { createContext, useState } from 'react';

import { login as fazerLogin } from '@/services/auth.service';
import { saveToken } from '@/storage/secureStorage';
import { LoginRequest } from '@/types/auth.types';

interface ContextoAutenticacao {
  entrar: (dados: LoginRequest) => Promise<void>;
  sair: () => Promise<void>;
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
  const [estaAutenticado, setEstaAutenticado] = useState(false);

  async function entrar(dados: LoginRequest) {
    const resposta = await fazerLogin(dados);

    await saveToken(resposta.access_token);

    setEstaAutenticado(true);
  }

  async function sair() {
    setEstaAutenticado(false);
  }

  return (
    <ContextoAutenticacao.Provider
      value={{
        entrar,
        sair,
        estaAutenticado,
      }}
    >
      {children}
    </ContextoAutenticacao.Provider>
  );
}