import { api } from './api';

import {
  FichaAlunoCompleta,
  FichaAlunoLista,
  TreinoAluno,
} from '@/types/fichaAluno.types';

export async function listarMinhasFichas(): Promise<FichaAlunoLista[]> {
  const resposta = await api.get<FichaAlunoLista[]>('/ficha/aluno');

  return resposta.data;
}

export async function buscarFichaCompleta(
  id: number
): Promise<FichaAlunoCompleta> {
  const resposta = await api.get<FichaAlunoCompleta>(`/ficha/${id}`);

  return resposta.data;
}

export async function buscarTreinosDeHoje(
  fichaId: number
): Promise<TreinoAluno[]> {
  const resposta = await api.get<TreinoAluno[]>(`/treino/hoje/${fichaId}`);

  return resposta.data;
}
