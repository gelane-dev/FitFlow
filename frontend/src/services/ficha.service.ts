import axios from 'axios';

import { api } from './api';

import {
  FichaAtualizar,
  FichaCompleta,
  FichaCompletaAtualizar,
  FichaCriar,
  FichaLista,
  StatusFicha,
  ItemFicha,
  ItemFichaAtualizar,
  ItemFichaCriar,
} from '@/types/ficha.types';
import {
  FichaDuplicar,
  FichaVersaoConteudo,
  FichaVersaoResumo,
} from '@/types/professorWeb.types';

export async function buscarFichas(
  alunoId?: number,
  status?: StatusFicha
): Promise<FichaLista[]> {
  const resposta = await api.get<FichaLista[]>('/ficha', {
    params: alunoId || status ? { aluno_id: alunoId, status } : undefined,
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

/** Ficha com treinos e itens ativos (editor web do professor). */
export async function buscarFichaCompleta(id: number): Promise<FichaCompleta> {
  const resposta = await api.get<FichaCompleta>(`/ficha/${id}/completa`);

  return resposta.data;
}

/** Salva a ficha inteira (campos, treinos e itens) numa única transação; devolve a ficha completa. */
export async function salvarFichaCompleta(
  id: number,
  dados: FichaCompletaAtualizar
): Promise<FichaCompleta> {
  const resposta = await api.put<FichaCompleta>(`/ficha/${id}/completa`, dados);

  return resposta.data;
}

/** Publica a ficha e cria uma nova versão no histórico. */
export async function publicarFicha(id: number): Promise<FichaVersaoResumo> {
  const resposta = await api.post<FichaVersaoResumo>(`/ficha/${id}/publicar`);

  return resposta.data;
}

export async function listarVersoesFicha(
  id: number
): Promise<FichaVersaoResumo[]> {
  const resposta = await api.get<FichaVersaoResumo[]>(`/ficha/${id}/versoes`);

  return resposta.data;
}

export async function buscarVersaoFicha(
  id: number,
  numero: number
): Promise<FichaVersaoConteudo> {
  const resposta = await api.get<FichaVersaoConteudo>(
    `/ficha/${id}/versoes/${numero}`
  );

  return resposta.data;
}

/** Copia treinos e itens ativos como nova ficha em rascunho. */
export async function duplicarFicha(
  id: number,
  dados: FichaDuplicar = {}
): Promise<FichaLista> {
  const resposta = await api.post<FichaLista>(`/ficha/${id}/duplicar`, dados);

  return resposta.data;
}

/** Copia o item logo abaixo do original. */
export async function duplicarItemFicha(id: number): Promise<ItemFicha> {
  const resposta = await api.post<ItemFicha>(`/ficha/item/${id}/duplicar`);

  return resposta.data;
}

export async function deletarFicha(
  id: number
): Promise<void> {
  await api.delete(`/ficha/${id}`);
}
