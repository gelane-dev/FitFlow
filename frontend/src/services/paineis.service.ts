import { api } from './api';
import { limparParametros } from './gestaoAlunos.service';

import {
  DashboardAdmin,
  DashboardRecepcao,
  Financeiro,
  FiltrosFinanceiro,
} from '@/types/gestao.types';
import {
  FrequenciaAluno,
  ProfessorDashboard,
} from '@/types/professorWeb.types';

export async function buscarDashboardAdmin(): Promise<DashboardAdmin> {
  const resposta = await api.get<DashboardAdmin>('/admin/dashboard');

  return resposta.data;
}

export async function buscarDashboardRecepcao(): Promise<DashboardRecepcao> {
  const resposta = await api.get<DashboardRecepcao>('/recepcao/dashboard');

  return resposta.data;
}

export async function buscarDashboardProfessor(): Promise<ProfessorDashboard> {
  const resposta = await api.get<ProfessorDashboard>('/professor/dashboard');

  return resposta.data;
}

export async function buscarFinanceiro(
  filtros?: FiltrosFinanceiro
): Promise<Financeiro> {
  const resposta = await api.get<Financeiro>('/admin/financeiro', {
    params: limparParametros(filtros),
  });

  return resposta.data;
}

/** Frequência de um aluno (professor vinculado ou admin). */
export async function buscarFrequenciaAluno(
  alunoId: number,
  meses?: number
): Promise<FrequenciaAluno> {
  const resposta = await api.get<FrequenciaAluno>(
    `/alunos/${alunoId}/frequencia`,
    { params: limparParametros({ meses }) }
  );

  return resposta.data;
}
