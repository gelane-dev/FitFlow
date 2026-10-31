import { useState } from 'react';

import { atualizarItemFicha } from '@/services/ficha.service';
import { reordenarItensTreino } from '@/services/treino.service';
import { ItemFicha, ItemFichaAtualizar } from '@/types/ficha.types';
import { mensagemErro } from '@/utils/erroApi';
import { montarTroca } from '@/utils/ordem';

export function useItemEdicao() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function atualizar(
    id: number,
    dados: ItemFichaAtualizar
  ): Promise<ItemFicha | null> {
    try {
      setCarregando(true);
      setErro(null);

      return await atualizarItemFicha(id, dados);
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao atualizar exercício.'));

      return null;
    } finally {
      setCarregando(false);
    }
  }

  /**
   * Troca a ordem do item `indice` com o vizinho (lista já ordenada) em uma
   * única chamada atômica. Retorna true em caso de sucesso; o chamador
   * recarrega a lista (também em caso de erro).
   */
  async function mover(
    treinoId: number,
    itens: ItemFicha[],
    indice: number,
    direcao: -1 | 1
  ): Promise<boolean> {
    const troca = montarTroca(itens, indice, direcao);

    if (troca.length === 0) {
      return false;
    }

    try {
      setCarregando(true);
      setErro(null);

      await reordenarItensTreino(treinoId, troca);

      return true;
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao reordenar exercícios.'));

      return false;
    } finally {
      setCarregando(false);
    }
  }

  return { atualizar, mover, carregando, erro };
}
