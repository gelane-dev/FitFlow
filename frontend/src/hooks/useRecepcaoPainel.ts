import { buscarDashboardRecepcao } from '@/services/paineis.service';

import { useGestaoConsulta } from './useGestaoConsulta';

/** Indicadores, últimos cadastros e atendimentos recentes (GET /recepcao/dashboard). */
export function useRecepcaoPainel() {
  return useGestaoConsulta(buscarDashboardRecepcao, 'Erro ao carregar o painel.', []);
}
