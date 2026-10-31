import { api } from './api';

import {
  EvolucaoExercicio,
  EvolucaoExercicioResumo,
} from '@/types/evolucao.types';

export async function listarMinhaEvolucao(): Promise<EvolucaoExercicioResumo[]> {
  const resposta = await api.get<EvolucaoExercicioResumo[]>(
    '/evolucao/exercicios'
  );

  return resposta.data;
}

export async function buscarMinhaEvolucao(
  exercicioId: number
): Promise<EvolucaoExercicio> {
  const resposta = await api.get<EvolucaoExercicio>(
    `/evolucao/exercicios/${exercicioId}`
  );

  return resposta.data;
}

export async function listarEvolucaoDoAluno(
  alunoId: number
): Promise<EvolucaoExercicioResumo[]> {
  const resposta = await api.get<EvolucaoExercicioResumo[]>(
    `/alunos/${alunoId}/evolucao/exercicios`
  );

  return resposta.data;
}

export async function buscarEvolucaoDoAluno(
  alunoId: number,
  exercicioId: number
): Promise<EvolucaoExercicio> {
  const resposta = await api.get<EvolucaoExercicio>(
    `/alunos/${alunoId}/evolucao/exercicios/${exercicioId}`
  );

  return resposta.data;
}
