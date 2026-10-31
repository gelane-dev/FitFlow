import axios from 'axios';

import { api } from './api';

import {
  FichaAtualizar,
  FichaCriar,
  FichaLista,
  ItemFicha,
  ItemFichaAtualizar,
  ItemFichaCriar,
} from '@/types/ficha.types';

export async function buscarFichas(
  alunoId?: number
): Promise<FichaLista[]> {
  const resposta = await api.get<FichaLista[]>('/ficha', {
    params: alunoId ? { aluno_id: alunoId } : undefined,
  });

  return resposta.data;
}

export async function buscarFicha(
  id: number
): Promise<FichaLista> {
  const resposta = await api.get<FichaLista>(
    `/ficha/professor/${id}`
  );

  return resposta.data;
}

export async function criarFicha(
  dados: FichaCriar
): Promise<FichaLista> {
  const resposta = await api.post<FichaLista>(
    '/ficha',
    dados
  );

  return resposta.data;
}

export async function atualizarFicha(
  id: number,
  dados: FichaAtualizar
): Promise<FichaLista> {
  const resposta = await api.put<FichaLista>(`/ficha/${id}`, dados);

  return resposta.data;
}

export async function buscarItensTreino(
  treinoId: number
): Promise<ItemFicha[]> {
  try {
    const resposta = await api.get<ItemFicha[]>(
      `/ficha/itens/treino/${treinoId}`
    );

    return resposta.data;
  } catch (erro) {
    if (axios.isAxiosError(erro) && erro.response?.status === 404) {
      return [];
    }

    throw erro;
  }
}

export async function criarItemFicha(
  dados: ItemFichaCriar
): Promise<ItemFicha> {
  const resposta = await api.post<ItemFicha>(
    '/ficha/itens',
    dados
  );

  return resposta.data;
}

export async function atualizarItemFicha(
  id: number,
  dados: ItemFichaAtualizar
): Promise<ItemFicha> {
  const resposta = await api.put<ItemFicha>(`/ficha/item/${id}`, dados);

  return resposta.data;
}

export async function deletarItemFicha(
  id: number
): Promise<void> {
  await api.delete(`/ficha/item/${id}`);
}

export async function deletarFicha(
  id: number
): Promise<void> {
  await api.delete(`/ficha/${id}`);
}
