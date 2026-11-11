import { useCallback, useState } from 'react';

import { listarMatriculas } from '@/services/matriculas.service';
import { listarPlanos } from '@/services/planos.service';
import { SituacaoMatricula, StatusMatricula } from '@/types/gestao.types';

import { useAdminRecurso } from './useAdminBase';

export const POR_PAGINA_MATRICULAS = 20;

export interface FiltrosMatriculasAdmin {
  status: StatusMatricula | null;
  situacao: SituacaoMatricula | null;
  planoId: number | null;
  pagina: number;
}

export const FILTROS_MATRICULAS_VAZIOS: FiltrosMatriculasAdmin = {
  status: null,
  situacao: null,
  planoId: null,
  pagina: 1,
};

/** Lista paginada de matrículas com filtros (status, situação e plano). */
export function useAdminMatriculas() {
  const [filtros, setFiltros] = useState<FiltrosMatriculasAdmin>(FILTROS_MATRICULAS_VAZIOS);

  const lista = useAdminRecurso(
    () =>
      listarMatriculas({
        status: filtros.status ?? undefined,
        situacao: filtros.situacao ?? undefined,
        plano_id: filtros.planoId ?? undefined,
        pagina: filtros.pagina,
        por_pagina: POR_PAGINA_MATRICULAS,
      }),
    JSON.stringify(filtros),
    'Erro ao carregar as matrículas.'
  );
  const planos = useAdminRecurso(() => listarPlanos(), 'matriculas-planos', 'Erro ao carregar os planos.');

  const definirFiltros = useCallback((parcial: Partial<Omit<FiltrosMatriculasAdmin, 'pagina'>>) => {
    setFiltros((atual) => ({ ...atual, ...parcial, pagina: 1 }));
  }, []);

  const mudarPagina = useCallback((pagina: number) => setFiltros((atual) => ({ ...atual, pagina })), []);

  const { recarregar: recarregarLista } = lista;
  const { recarregar: recarregarPlanos } = planos;
  const recarregar = useCallback(async () => {
    await Promise.all([recarregarLista(), recarregarPlanos()]);
  }, [recarregarLista, recarregarPlanos]);

  return {
    matriculas: lista.dados?.itens ?? [],
    total: lista.dados?.total ?? 0,
    filtros,
    definirFiltros,
    mudarPagina,
    planos: planos.dados ?? [],
    carregando: lista.carregando,
    erro: lista.erro,
    recarregar,
    recarregarLista,
  };
}
