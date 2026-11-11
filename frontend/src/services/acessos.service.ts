import { api } from './api';
import { limparParametros } from './gestaoAlunos.service';

import {
  AcessoRegistrar,
  AcessoResposta,
  AcessoVerificacao,
  ConsultaAcesso,
  FiltrosAcessos,
  Paginado,
} from '@/types/gestao.types';

export async function verificarAcesso(
  consulta: ConsultaAcesso
): Promise<AcessoVerificacao> {
  const resposta = await api.get<AcessoVerificacao>('/acessos/verificar', {
    params: limparParametros(consulta),
  });

  return resposta.data;
}

export async function registrarAcesso(
  dados: AcessoRegistrar
): Promise<AcessoResposta> {
  const resposta = await api.post<AcessoResposta>('/acessos', dados);

  return resposta.data;
}

export async function listarAcessos(
  filtros?: FiltrosAcessos
): Promise<Paginado<AcessoResposta>> {
  const resposta = await api.get<Paginado<AcessoResposta>>('/acessos', {
    params: limparParametros(filtros),
  });

  return resposta.data;
}
