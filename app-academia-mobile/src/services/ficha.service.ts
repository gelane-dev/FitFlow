import axios from 'axios';

import { api } from './api';

import {
  FichaCriar,
  FichaLista,
  ItemFicha,
  ItemFichaCriar,
} from '@/types/ficha.types';

export async function buscarFichas(): Promise<FichaLista[]> {
  const resposta = await api.get<FichaLista[]>('/ficha');

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
