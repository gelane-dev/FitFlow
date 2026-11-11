import { useCallback, useMemo, useState } from 'react';

import {
  alterarStatusPlano,
  atualizarPlano,
  criarPlano,
  listarAlunosDoPlano,
  listarPlanos,
} from '@/services/planos.service';
import { PlanoCriar } from '@/types/gestao.types';

import { useAdminAcao, useAdminRecurso } from './useAdminBase';

export type FiltroSituacaoPlano = 'todos' | 'ativos' | 'inativos';

/** Planos: lista (filtro por situação feito no app, sobre a lista completa), criar, editar e ativar/desativar. */
export function useAdminPlanos() {
  const lista = useAdminRecurso(() => listarPlanos(), 'planos', 'Erro ao carregar os planos.');
  const { processando, executar } = useAdminAcao();
  const [filtro, setFiltro] = useState<FiltroSituacaoPlano>('todos');
  const { recarregar } = lista;

  const planos = useMemo(() => {
    const todos = lista.dados ?? [];

    if (filtro === 'ativos') return todos.filter((plano) => plano.ativo);
    if (filtro === 'inativos') return todos.filter((plano) => !plano.ativo);

    return todos;
  }, [lista.dados, filtro]);

  const criar = useCallback(
    async (dados: PlanoCriar) => {
      const resultado = await executar(() => criarPlano(dados), 'Erro ao criar o plano.');

      if (resultado.ok) await recarregar();

      return resultado;
    },
    [executar, recarregar]
  );

  const editar = useCallback(
    async (id: number, dados: PlanoCriar) => {
      const resultado = await executar(() => atualizarPlano(id, dados), 'Erro ao salvar o plano.');

      if (resultado.ok) await recarregar();

      return resultado;
    },
    [executar, recarregar]
  );

  const alternarStatus = useCallback(
    async (id: number, ativo: boolean) => {
      const resultado = await executar(
        () => alterarStatusPlano(id, { ativo }),
        ativo ? 'Erro ao ativar o plano.' : 'Erro ao desativar o plano.'
      );

      if (resultado.ok) await recarregar();

      return resultado;
    },
    [executar, recarregar]
  );

  return {
    planos,
    totalGeral: lista.dados?.length ?? 0,
    carregado: lista.dados !== null,
    carregando: lista.carregando,
    erro: lista.erro,
    recarregar,
    filtro,
    definirFiltro: setFiltro,
    processando,
    criar,
    editar,
    alternarStatus,
  };
}

/** Alunos com matrícula ativa em um plano (carrega só quando `planoId` é informado). */
export function useAdminPlanoAlunos(planoId: number | null) {
  const recurso = useAdminRecurso(
    () => listarAlunosDoPlano(planoId as number),
    `plano-alunos-${planoId}`,
    'Erro ao carregar os alunos do plano.',
    planoId !== null
  );

  return {
    alunos: recurso.dados ?? [],
    carregando: recurso.carregando,
    erro: recurso.erro,
    recarregar: recurso.recarregar,
  };
}
