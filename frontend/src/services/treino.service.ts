import axios from 'axios';

import { api } from './api';

import {
  ItemFicha,
  Treino,
  TreinoAtualizar,
  TreinoCriar,
} from '@/types/ficha.types';
import { OrdemItem } from '@/utils/ordem';

export async function buscarTreinos(
  fichaId: number
): Promise<Treino[]> {
  try {
    const resposta = await api.get<Treino[]>(
      `/treino/ficha/${fichaId}`
    );

    return resposta.data;
  } catch (erro) {
    if (axios.isAxiosError(erro) && erro.response?.status === 404) {
      return [];
    }

    throw erro;
  }
}

export async function criarTreino(
  dados: TreinoCriar
): Promise<Treino> {
  const resposta = await api.post<Treino>(
    '/treino',
    dados
  );

  return resposta.data;
}

export async function atualizarTreino(
  id: number,
  dados: TreinoAtualizar
): Promise<Treino> {
  const resposta = await api.put<Treino>(`/treino/${id}`, dados);

  return resposta.data;
}

export async function deletarTreino(
  id: number
): Promise<void> {
  await api.delete(`/treino/${id}`);
}

/** Aplica a nova ordem dos itens do treino em uma transação (ADR-028). */
export async function reordenarItensTreino(
  treinoId: number,
  itens: OrdemItem[]
): Promise<ItemFicha[]> {
  const resposta = await api.put<ItemFicha[]>(
    `/treino/${treinoId}/itens/ordem`,
    { itens }
  );

  return resposta.data;
}
