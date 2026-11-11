import { useCallback, useMemo, useState } from 'react';

import { listarPagamentos } from '@/services/pagamentos.service';
import { buscarFinanceiro } from '@/services/paineis.service';
import { FiltrosFinanceiro, StatusPagamento } from '@/types/gestao.types';
import { deslocarMes, montarRecebidoPorForma, montarRecebidoPorMes, periodoDoMes } from '@/utils/painelAdmin';

import { useAdminRecurso } from './useAdminBase';

export const POR_PAGINA_PAGAMENTOS = 20;

/** Financeiro do admin: período (mês atual por padrão), totais e os dados dos gráficos. */
export function useAdminFinanceiro() {
  const [periodo, setPeriodo] = useState<Required<FiltrosFinanceiro>>(() => periodoDoMes());

  const recurso = useAdminRecurso(
    () => buscarFinanceiro(periodo),
    `financeiro-${periodo.inicio}-${periodo.fim}`,
    'Erro ao carregar o financeiro.'
  );

  const graficos = useMemo(
    () =>
      recurso.dados
        ? {
            porMes: montarRecebidoPorMes(recurso.dados.recebido_por_mes),
            porForma: montarRecebidoPorForma(recurso.dados.recebido_por_forma),
          }
        : null,
    [recurso.dados]
  );

  const mudarMes = useCallback((delta: number) => setPeriodo((atual) => deslocarMes(atual, delta)), []);
  const voltarAoMesAtual = useCallback(() => setPeriodo(periodoDoMes()), []);

  return {
    periodo,
    definirPeriodo: setPeriodo,
    mudarMes,
    voltarAoMesAtual,
    financeiro: recurso.dados,
    graficos,
    carregando: recurso.carregando,
    erro: recurso.erro,
    recarregar: recurso.recarregar,
  };
}

export interface FiltrosPagamentosAdmin {
  status: StatusPagamento | null;
  somenteInadimplentes: boolean;
  pagina: number;
}

/** Lista paginada de pagamentos do período, com filtro de situação (o estorno usa `useGestaoAcoesFinanceiras`). */
export function useAdminPagamentos(periodo: Required<FiltrosFinanceiro>) {
  const [filtros, setFiltros] = useState<FiltrosPagamentosAdmin>({
    status: null,
    somenteInadimplentes: false,
    pagina: 1,
  });

  const recurso = useAdminRecurso(
    () =>
      listarPagamentos({
        inicio: periodo.inicio,
        fim: periodo.fim,
        status: filtros.status ?? undefined,
        inadimplentes: filtros.somenteInadimplentes ? true : undefined,
        pagina: filtros.pagina,
        por_pagina: POR_PAGINA_PAGAMENTOS,
      }),
    `pagamentos-${periodo.inicio}-${periodo.fim}-${filtros.status}-${filtros.somenteInadimplentes}-${filtros.pagina}`,
    'Erro ao carregar os pagamentos.'
  );
  /** Mudar um filtro volta para a primeira página. */
  const definirFiltros = useCallback((parcial: Partial<Omit<FiltrosPagamentosAdmin, 'pagina'>>) => {
    setFiltros((atual) => ({ ...atual, ...parcial, pagina: 1 }));
  }, []);

  const mudarPagina = useCallback((pagina: number) => setFiltros((atual) => ({ ...atual, pagina })), []);

  return {
    pagamentos: recurso.dados?.itens ?? [],
    total: recurso.dados?.total ?? 0,
    filtros,
    definirFiltros,
    mudarPagina,
    carregando: recurso.carregando,
    erro: recurso.erro,
    recarregar: recurso.recarregar,
  };
}
