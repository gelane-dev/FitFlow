import { api } from './api';

import { AlunoLista } from '@/types/ficha.types';

export async function buscarAlunos(): Promise<AlunoLista[]> {
  const resposta = await api.get<AlunoLista[]>('/alunos');

  return resposta.data;
}
