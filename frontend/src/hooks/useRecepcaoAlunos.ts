import { useCallback, useState } from 'react';

import { listarGestaoAlunos } from '@/services/gestaoAlunos.service';
import type { SituacaoAluno } from '@/types/gestao.types';

import { useGestaoConsulta } from './useGestaoConsulta';

export const POR_PAGINA_ALUNOS = 20;

/** Lista paginada de alunos com busca e filtro de situação (inclui "pendente" = aguardando aprovação). */
export function useRecepcaoAlunos() {
  const [busca, setBuscaEstado] = useState('');
  const [situacao, setSituacaoEstado] = useState<SituacaoAluno | null>(null);
  const [pagina, setPagina] = useState(1);

  const consulta = useGestaoConsulta(
    () =>
      listarGestaoAlunos({
        busca: busca.trim() || undefined,
        situacao: situacao ?? undefined,
        pagina,
        por_pagina: POR_PAGINA_ALUNOS,
      }),
    'Erro ao carregar os alunos.',
    [busca, situacao, pagina]
  );

  const setBusca = useCallback((texto: string) => {
    setBuscaEstado(texto);
    setPagina(1);
  }, []);

  const setSituacao = useCallback((valor: SituacaoAluno | null) => {
    setSituacaoEstado(valor);
    setPagina(1);
  }, []);

  return {
    alunos: consulta.dados?.itens ?? [],
    total: consulta.dados?.total ?? 0,
    carregando: consulta.carregando,
    erro: consulta.erro,
    recarregar: consulta.recarregar,
    busca,
    setBusca,
    situacao,
    setSituacao,
    pagina,
    setPagina,
  };
}
