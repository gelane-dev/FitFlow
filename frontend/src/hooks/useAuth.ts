import axios from 'axios';
import { useContext, useState } from 'react';

import { ContextoAutenticacao } from '@/contexts/AuthContext';
import { ErroApi } from '@/types/api.types';
import { LoginRequest } from '@/types/auth.types';

export function useAuth() {
  const contexto = useContext(ContextoAutenticacao);

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(dados: LoginRequest) {
    try {
      setCarregando(true);
      setErro(null);

      await contexto.entrar(dados);
    } catch (erro) {
      if (axios.isAxiosError<ErroApi>(erro)) {
        setErro(
          erro.response?.data?.detail ||
            'Erro ao realizar login.'
        );

        return;
      }

      setErro('Ocorreu um erro inesperado.');
    } finally {
      setCarregando(false);
    }
  }

  return {
    ...contexto,
    entrar,
    carregando,
    erro,
  };
}