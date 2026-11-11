import { api } from './api';
import { limparParametros } from './gestaoAlunos.service';

import {
  FiltrosPlanos,
  PlanoAlunoResumo,
  PlanoAtualizar,
  PlanoCriar,
  PlanoResposta,
  StatusAtualizar,
} from '@/types/gestao.types';

export async function listarPlanos(
  filtros?: FiltrosPlanos
): Promise<PlanoResposta[]> {
  const resposta = await api.get<PlanoResposta[]>('/planos', {
    params: limparParametros(filtros),
  });

  return resposta.data;
}

export async function criarPlano(dados: PlanoCriar): Promise<PlanoResposta> {
  const resposta = await api.post<PlanoResposta>('/admin/planos', dados);

  return resposta.data;
}

export async function atualizarPlano(
  id: number,
  dados: PlanoAtualizar
): Promise<PlanoResposta> {
  const resposta = await api.put<PlanoResposta>(`/admin/planos/${id}`, dados);

  return resposta.data;
}

export async function alterarStatusPlano(
  id: number,
  dados: StatusAtualizar
): Promise<PlanoResposta> {
  const resposta = await api.put<PlanoResposta>(
    `/admin/planos/${id}/status`,
    dados
  );

  return resposta.data;
}

export async function listarAlunosDoPlano(
  id: number
): Promise<PlanoAlunoResumo[]> {
  const resposta = await api.get<PlanoAlunoResumo[]>(
    `/admin/planos/${id}/alunos`
  );

  return resposta.data;
}
