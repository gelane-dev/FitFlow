import { api } from './api';

import {
  AcessoResposta,
  AlunoProfessorAtualizar,
  AlunoRestricaoAtualizar,
  AlunoStatusAtualizar,
  FiltrosAcessos,
  FiltrosGestaoAlunos,
  GestaoAlunoAtualizar,
  GestaoAlunoCriar,
  GestaoAlunoDetalhe,
  GestaoAlunoItem,
  MatriculaResposta,
  Paginado,
  PagamentoResposta,
} from '@/types/gestao.types';
import { FrequenciaAluno } from '@/types/professorWeb.types';

/** Remove chaves `undefined` (e `null`) para a query não carregar lixo. */
export function limparParametros<T extends object>(
  filtros?: T
): Record<string, string | number | boolean> | undefined {
  if (!filtros) return undefined;

  const resultado: Record<string, string | number | boolean> = {};

  for (const [chave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== null) {
      resultado[chave] = valor as string | number | boolean;
    }
  }

  return resultado;
}

export async function listarGestaoAlunos(
  filtros?: FiltrosGestaoAlunos
): Promise<Paginado<GestaoAlunoItem>> {
  const resposta = await api.get<Paginado<GestaoAlunoItem>>(
    '/gestao/alunos',
    { params: limparParametros(filtros) }
  );

  return resposta.data;
}

export async function buscarGestaoAluno(
  id: number
): Promise<GestaoAlunoDetalhe> {
  const resposta = await api.get<GestaoAlunoDetalhe>(`/gestao/alunos/${id}`);

  return resposta.data;
}

export async function criarGestaoAluno(
  dados: GestaoAlunoCriar
): Promise<GestaoAlunoDetalhe> {
  const resposta = await api.post<GestaoAlunoDetalhe>(
    '/gestao/alunos',
    dados
  );

  return resposta.data;
}

export async function atualizarGestaoAluno(
  id: number,
  dados: GestaoAlunoAtualizar
): Promise<GestaoAlunoDetalhe> {
  const resposta = await api.put<GestaoAlunoDetalhe>(
    `/gestao/alunos/${id}`,
    dados
  );

  return resposta.data;
}

export async function aprovarAluno(id: number): Promise<GestaoAlunoDetalhe> {
  const resposta = await api.post<GestaoAlunoDetalhe>(
    `/gestao/alunos/${id}/aprovar`
  );

  return resposta.data;
}

export async function recusarAluno(id: number): Promise<GestaoAlunoDetalhe> {
  const resposta = await api.post<GestaoAlunoDetalhe>(
    `/gestao/alunos/${id}/recusar`
  );

  return resposta.data;
}

export async function listarMatriculasAluno(
  id: number
): Promise<MatriculaResposta[]> {
  const resposta = await api.get<MatriculaResposta[]>(
    `/gestao/alunos/${id}/matriculas`
  );

  return resposta.data;
}

export async function listarPagamentosAluno(
  id: number
): Promise<PagamentoResposta[]> {
  const resposta = await api.get<PagamentoResposta[]>(
    `/gestao/alunos/${id}/pagamentos`
  );

  return resposta.data;
}

export async function listarAcessosAluno(
  id: number,
  filtros?: Pick<FiltrosAcessos, 'pagina' | 'por_pagina'>
): Promise<Paginado<AcessoResposta>> {
  const resposta = await api.get<Paginado<AcessoResposta>>(
    `/gestao/alunos/${id}/acessos`,
    { params: limparParametros(filtros) }
  );

  return resposta.data;
}

export async function buscarFrequenciaGestaoAluno(
  id: number,
  meses?: number
): Promise<FrequenciaAluno> {
  const resposta = await api.get<FrequenciaAluno>(
    `/gestao/alunos/${id}/frequencia`,
    { params: limparParametros({ meses }) }
  );

  return resposta.data;
}

export async function alterarStatusAluno(
  id: number,
  dados: AlunoStatusAtualizar
): Promise<GestaoAlunoDetalhe> {
  const resposta = await api.put<GestaoAlunoDetalhe>(
    `/admin/alunos/${id}/status`,
    dados
  );

  return resposta.data;
}

export async function trocarProfessorAluno(
  id: number,
  dados: AlunoProfessorAtualizar
): Promise<GestaoAlunoDetalhe> {
  const resposta = await api.put<GestaoAlunoDetalhe>(
    `/admin/alunos/${id}/professor`,
    dados
  );

  return resposta.data;
}

export async function alterarRestricaoAluno(
  id: number,
  dados: AlunoRestricaoAtualizar
): Promise<GestaoAlunoDetalhe> {
  const resposta = await api.put<GestaoAlunoDetalhe>(
    `/admin/alunos/${id}/restricao`,
    dados
  );

  return resposta.data;
}
