import { api } from './api';

import {
  Execucao,
  ExecucaoCriar,
  SessaoFinalizar,
  SessaoResposta,
  SessaoResumo,
} from '@/types/sessao.types';

/** Idempotente: devolve a sessão não finalizada do treino, se existir. */
export async function iniciarSessao(treinoId: number): Promise<SessaoResposta> {
  const resposta = await api.post<SessaoResposta>('/sessoes', {
    treino_id: treinoId,
  });

  return resposta.data;
}

export async function registrarExecucoes(
  sessaoId: number,
  execucoes: ExecucaoCriar[]
): Promise<Execucao[]> {
  const resposta = await api.post<Execucao[]>(
    `/sessoes/${sessaoId}/execucoes`,
    { execucoes }
  );

  return resposta.data;
}

export async function finalizarSessao(
  sessaoId: number,
  dados: SessaoFinalizar
): Promise<SessaoResposta> {
  const resposta = await api.post<SessaoResposta>(
    `/sessoes/${sessaoId}/finalizar`,
    dados
  );

  return resposta.data;
}

export interface PaginacaoSessoes {
  limite?: number;
  deslocamento?: number;
}

/** Sem parâmetros devolve tudo; com `limite`/`deslocamento` pagina (mais recentes primeiro). */
export async function listarMinhasSessoes(paginacao?: PaginacaoSessoes): Promise<SessaoResumo[]> {
  const resposta = paginacao
    ? await api.get<SessaoResumo[]>('/sessoes', { params: paginacao })
    : await api.get<SessaoResumo[]>('/sessoes');

  return resposta.data;
}

export async function buscarSessao(id: number): Promise<SessaoResposta> {
  const resposta = await api.get<SessaoResposta>(`/sessoes/${id}`);

  return resposta.data;
}
