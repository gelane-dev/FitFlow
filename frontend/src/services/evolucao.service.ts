import { api } from './api';

import {
  EvolucaoExercicio,
  EvolucaoExercicioResumo,
  PeriodoEvolucao,
} from '@/types/evolucao.types';

export async function listarMinhaEvolucao(): Promise<EvolucaoExercicioResumo[]> {
  const resposta = await api.get<EvolucaoExercicioResumo[]>(
    '/evolucao/exercicios'
  );

  return resposta.data;
}

/** `periodo` é opcional: sem ele a chamada é idêntica à de antes (todo o histórico). */
export async function buscarMinhaEvolucao(
  exercicioId: number,
  periodo?: PeriodoEvolucao | null
): Promise<EvolucaoExercicio> {
  const url = `/evolucao/exercicios/${exercicioId}`;
  const resposta = periodo
    ? await api.get<EvolucaoExercicio>(url, { params: { periodo } })
    : await api.get<EvolucaoExercicio>(url);

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
