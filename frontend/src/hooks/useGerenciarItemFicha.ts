import axios from 'axios';
import { useState } from 'react';

import {
  criarItemFicha,
  deletarItemFicha,
} from '@/services/ficha.service';
import { ErroApi } from '@/types/api.types';
import { ItemFicha, ItemFichaCriar } from '@/types/ficha.types';

export function useGerenciarItemFicha() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function criar(
    dados: ItemFichaCriar
  ): Promise<ItemFicha | null> {
    try {
      setCarregando(true);
      setErro(null);

      return await criarItemFicha(dados);
    } catch (erro) {
      if (axios.isAxiosError<ErroApi>(erro)) {
        setErro(
          erro.response?.data?.detail ||
            'Erro ao adicionar exercício.'
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

      await deletarItemFicha(id);

      return true;
    } catch (erro) {
      if (axios.isAxiosError<ErroApi>(erro)) {
        setErro(
          erro.response?.data?.detail ||
            'Erro ao remover exercício.'
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
