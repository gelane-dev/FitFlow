import { api } from './api';
import { limparParametros } from './gestaoAlunos.service';

import {
  Comprovante,
  FiltrosPagamentos,
  PagamentoAvulsoCriar,
  PagamentoEstornar,
  PagamentoRegistrar,
  PagamentoResposta,
  Paginado,
} from '@/types/gestao.types';

export async function listarPagamentos(
  filtros?: FiltrosPagamentos
): Promise<Paginado<PagamentoResposta>> {
  const resposta = await api.get<Paginado<PagamentoResposta>>('/pagamentos', {
    params: limparParametros(filtros),
  });

  return resposta.data;
}

export async function registrarPagamento(
  id: number,
  dados: PagamentoRegistrar
): Promise<PagamentoResposta> {
  const resposta = await api.post<PagamentoResposta>(
    `/pagamentos/${id}/registrar`,
    dados
  );

  return resposta.data;
}

export async function criarPagamentoAvulso(
  dados: PagamentoAvulsoCriar
): Promise<PagamentoResposta> {
  const resposta = await api.post<PagamentoResposta>('/pagamentos', dados);

  return resposta.data;
}

export async function estornarPagamento(
  id: number,
  dados: PagamentoEstornar
): Promise<PagamentoResposta> {
  const resposta = await api.post<PagamentoResposta>(
    `/pagamentos/${id}/estornar`,
    dados
  );

  return resposta.data;
}

export async function buscarComprovante(id: number): Promise<Comprovante> {
  const resposta = await api.get<Comprovante>(`/pagamentos/${id}/comprovante`);

  return resposta.data;
}
