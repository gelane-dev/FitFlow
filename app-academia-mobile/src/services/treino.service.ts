import axios from 'axios';

import { api } from './api';

import { Treino, TreinoCriar } from '@/types/ficha.types';

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

export async function deletarTreino(
  id: number
): Promise<void> {
  await api.delete(`/treino/${id}`);
}
