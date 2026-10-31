import axios from 'axios';
import { useState } from 'react';

import { cadastro } from '@/services/auth.service';
import { ErroApi } from '@/types/api.types';
import { CadastroRequest } from '@/types/auth.types';

export function useCadastro() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function fazerCadastro(
    dados: CadastroRequest
  ): Promise<boolean> {
    try {
      setCarregando(true);
      setErro(null);

      await cadastro(dados);

      return true;
    } catch (erro) {
      if (axios.isAxiosError<ErroApi>(erro)) {
        setErro(
          erro.response?.data?.detail ||
            'Erro ao realizar cadastro.'
        );

        return false;
      }

      setErro('Ocorreu um erro inesperado.');

      return false;
    } finally {
      setCarregando(false);
    }
  }

  return {
    fazerCadastro,
    carregando,
    erro,
  };
}