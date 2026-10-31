import { api } from './api';

import {
  AvaliacaoCriar,
  AvaliacaoResposta,
} from '@/types/avaliacao.types';

export async function criarAvaliacao(
  alunoId: number,
  dados: AvaliacaoCriar
): Promise<AvaliacaoResposta> {
  const resposta = await api.post<AvaliacaoResposta>(
    `/alunos/${alunoId}/avaliacoes`,
    dados
  );

  return resposta.data;
}

export async function listarAvaliacoesAluno(
  alunoId: number
): Promise<AvaliacaoResposta[]> {
  const resposta = await api.get<AvaliacaoResposta[]>(
    `/alunos/${alunoId}/avaliacoes`
  );

  return resposta.data;
}

export async function listarMinhasAvaliacoes(): Promise<
  AvaliacaoResposta[]
> {
  const resposta = await api.get<AvaliacaoResposta[]>('/avaliacoes');

  return resposta.data;
}

export async function atualizarAvaliacao(
  id: number,
  dados: AvaliacaoCriar
): Promise<AvaliacaoResposta> {
  const resposta = await api.put<AvaliacaoResposta>(
    `/avaliacoes/${id}`,
    dados
  );

  return resposta.data;
}

export async function excluirAvaliacao(id: number): Promise<void> {
  await api.delete(`/avaliacoes/${id}`);
}
