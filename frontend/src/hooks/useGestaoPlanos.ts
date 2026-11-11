import { listarPlanos } from '@/services/planos.service';

import { useGestaoConsulta } from './useGestaoConsulta';

/** Planos ativos (a recepção só enxerga os ativos), para matricular, renovar ou alterar plano. */
export function useGestaoPlanos(habilitado = true) {
  return useGestaoConsulta(
    habilitado ? () => listarPlanos({ ativo: true }) : null,
    'Erro ao carregar os planos.',
    [habilitado]
  );
}
