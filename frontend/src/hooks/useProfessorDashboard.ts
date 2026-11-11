import { buscarDashboardProfessor } from '@/services/paineis.service';

import { useGestaoConsulta } from './useGestaoConsulta';

/** Dashboard do professor (GET /professor/dashboard). */
export function useProfessorDashboard() {
  const consulta = useGestaoConsulta(() => buscarDashboardProfessor(), 'Erro ao carregar o painel.', []);

  return { dashboard: consulta.dados, carregando: consulta.carregando, erro: consulta.erro, recarregar: consulta.recarregar };
}
