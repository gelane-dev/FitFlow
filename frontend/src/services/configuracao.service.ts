import { api } from './api';

import {
  ConfiguracaoAdmin,
  ConfiguracaoAtualizar,
  ConfiguracaoPublica,
} from '@/types/gestao.types';

export async function buscarConfiguracaoPublica(): Promise<ConfiguracaoPublica> {
  const resposta = await api.get<ConfiguracaoPublica>('/configuracao');

  return resposta.data;
}

export async function buscarConfiguracaoAdmin(): Promise<ConfiguracaoAdmin> {
  const resposta = await api.get<ConfiguracaoAdmin>('/admin/configuracao');

  return resposta.data;
}

export async function atualizarConfiguracao(
  dados: ConfiguracaoAtualizar
): Promise<ConfiguracaoAdmin> {
  const resposta = await api.put<ConfiguracaoAdmin>(
    '/admin/configuracao',
    dados
  );

  return resposta.data;
}
