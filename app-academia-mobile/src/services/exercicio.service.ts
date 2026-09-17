import { api } from './api';

import { Exercicio } from '@/types/exercicio.types';

export async function buscarExercicios(): Promise<Exercicio[]> {
  const resposta = await api.get<Exercicio[]>('/exercicios');

  return resposta.data;
}

export async function buscarExercicio(
  id: number
): Promise<Exercicio> {
  const resposta = await api.get<Exercicio>(
    `/exercicios/${id}`
  );

  return resposta.data;
}