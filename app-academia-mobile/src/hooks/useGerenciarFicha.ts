import axios from 'axios';
import { useState } from 'react';

import { criarFicha, deletarFicha } from '@/services/ficha.service';
import { ErroApi } from '@/types/api.types';
import { FichaCriar, FichaLista } from '@/types/ficha.types';

export function useGerenciarFicha() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function criar(
    dados: FichaCriar
  ): Promise<FichaLista | null> {
    try {
      setCarregando(true);
      setErro(null);

      return await criarFicha(dados);
    } catch (erro) {
      if (axios.isAxiosError<ErroApi>(erro)) {
        setErro(
          erro.response?.data?.detail ||
            'Erro ao criar ficha.'
        );

        return null;
      }

      setErro('Ocorreu um erro inesperado.');

      return null;
    } finally {
      setCarregando(false);
    }
  }

  async function deletar(id: number): Promise<boolean> {
    try {
      setCarregando(true);
      setErro(null);

      await deletarFicha(id);

      return true;
    } catch (erro) {
      if (axios.isAxiosError<ErroApi>(erro)) {
        setErro(
          erro.response?.data?.detail ||
            'Erro ao excluir ficha.'
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
    criar,
    deletar,
    carregando,
    erro,
  };
}
