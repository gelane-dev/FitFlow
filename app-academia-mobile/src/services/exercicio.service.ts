import { api } from './api';

import {
  Exercicio,
  ExerciciosListaResposta,
} from '@/types/exercicio.types';

export async function buscarExercicios(
  paginaSolicitada: number
): Promise<ExerciciosListaResposta> {
  const resposta = await api.get<ExerciciosListaResposta>(
    '/exercicios', 
    { 
    params: {
      pagina: paginaSolicitada,
    },
  }
);

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