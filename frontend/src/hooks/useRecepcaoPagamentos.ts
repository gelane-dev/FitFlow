import { useCallback, useState } from 'react';

import { buscarComprovante, listarPagamentos } from '@/services/pagamentos.service';
import { dataBrParaIso } from '@/utils/datas';

import { useGestaoConsulta } from './useGestaoConsulta';

export const POR_PAGINA_PAGAMENTOS = 20;

/** Filtro rápido da lista: um status ou "inadimplentes". */
export type FiltroPagamento = 'pendente' | 'pago' | 'inadimplentes' | 'estornado';

/** Lista paginada de pagamentos com filtros (pendentes, pagos, inadimplentes) e período (DD/MM/AAAA). */
export function useRecepcaoPagamentos() {
  const [filtro, setFiltroEstado] = useState<FiltroPagamento | null>(null);
  const [inicio, setInicioEstado] = useState('');
  const [fim, setFimEstado] = useState('');
  const [pagina, setPagina] = useState(1);

  const inicioIso = dataBrParaIso(inicio) ?? undefined;
  const fimIso = dataBrParaIso(fim) ?? undefined;
  const periodoInvalido = !!inicioIso && !!fimIso && inicioIso > fimIso;

  const consulta = useGestaoConsulta(
    periodoInvalido
      ? null
      : () =>
          listarPagamentos({
            status: filtro && filtro !== 'inadimplentes' ? filtro : undefined,
            inadimplentes: filtro === 'inadimplentes' ? true : undefined,
            inicio: inicioIso,
            fim: fimIso,
            pagina,
            por_pagina: POR_PAGINA_PAGAMENTOS,
          }),
    'Erro ao carregar os pagamentos.',
    [filtro, inicioIso, fimIso, pagina, periodoInvalido]
  );

  const setFiltro = useCallback((valor: FiltroPagamento | null) => {
    setFiltroEstado(valor);
    setPagina(1);
  }, []);

  const setInicio = useCallback((texto: string) => {
    setInicioEstado(texto);
    setPagina(1);
  }, []);

  const setFim = useCallback((texto: string) => {
    setFimEstado(texto);
    setPagina(1);
  }, []);

  return {
    pagamentos: consulta.dados?.itens ?? [],
    total: consulta.dados?.total ?? 0,
    carregando: consulta.carregando,
    erro: consulta.erro,
    recarregar: consulta.recarregar,
    filtro,
    setFiltro,
    inicio,
    setInicio,
    fim,
    setFim,
    periodoInvalido,
    pagina,
    setPagina,
  };
}

/** Comprovante interno de um pagamento (GET /pagamentos/{id}/comprovante). */
export function useRecepcaoComprovante(id: number) {
  return useGestaoConsulta(() => buscarComprovante(id), 'Erro ao carregar o comprovante.', [id]);
}
