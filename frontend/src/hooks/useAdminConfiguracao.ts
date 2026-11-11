import { useCallback } from 'react';

import { atualizarConfiguracao, buscarConfiguracaoAdmin } from '@/services/configuracao.service';
import { ConfiguracaoAtualizar } from '@/types/gestao.types';

import { useAdminAcao, useAdminRecurso } from './useAdminBase';

/** Configuração da academia (dados, horários, regras de acesso e parâmetros). */
export function useAdminConfiguracao() {
  const recurso = useAdminRecurso(buscarConfiguracaoAdmin, 'configuracao', 'Erro ao carregar as configurações.');
  const { processando, executar } = useAdminAcao();
  const { recarregar } = recurso;

  const salvar = useCallback(
    async (dados: ConfiguracaoAtualizar) => {
      const resultado = await executar(() => atualizarConfiguracao(dados), 'Erro ao salvar as configurações.');

      if (resultado.ok) await recarregar();

      return resultado;
    },
    [executar, recarregar]
  );

  return {
    configuracao: recurso.dados,
    carregando: recurso.carregando,
    erro: recurso.erro,
    recarregar,
    processando,
    salvar,
  };
}
