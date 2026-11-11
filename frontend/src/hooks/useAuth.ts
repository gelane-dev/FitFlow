import { useContext, useState } from 'react';

import { ContextoAutenticacao } from '@/contexts/AuthContext';
import { mensagemErroLogin } from '@/utils/erroApi';
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
      setErro(mensagemErroLogin(erro));
    } finally {
      setCarregando(false);
    }
  }

  return {
    ...contexto,
    entrar,
    carregandoSessao: contexto.carregando,
    carregando,
    erro,
  };
}