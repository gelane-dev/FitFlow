import axios from 'axios';
import { useState } from 'react';

import { criarTreino, deletarTreino } from '@/services/treino.service';
import { ErroApi } from '@/types/api.types';
import { Treino, TreinoCriar } from '@/types/ficha.types';

export function useGerenciarTreino() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function criar(
    dados: TreinoCriar
  ): Promise<Treino | null> {
    try {
      setCarregando(true);
      setErro(null);

      return await criarTreino(dados);
    } catch (erro) {
      if (axios.isAxiosError<ErroApi>(erro)) {
        setErro(
          erro.response?.data?.detail ||
            'Erro ao criar treino.'
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

      await deletarTreino(id);

      return true;
    } catch (erro) {
      if (axios.isAxiosError<ErroApi>(erro)) {
        setErro(
          erro.response?.data?.detail ||
            'Erro ao excluir treino.'
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
