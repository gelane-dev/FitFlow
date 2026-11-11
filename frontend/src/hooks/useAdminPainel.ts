import { useMemo } from 'react';

import { buscarDashboardAdmin } from '@/services/paineis.service';
import {
  montarAlunosPorPlano,
  montarAlunosPorProfessor,
  montarAtivosInativos,
  montarCadastrosPorMes,
  montarFrequencia,
} from '@/utils/painelAdmin';

import { useAdminRecurso } from './useAdminBase';

/** Painel do admin: KPIs do `/admin/dashboard` e os dados de cada gráfico, já montados. */
export function useAdminPainel() {
  const recurso = useAdminRecurso(buscarDashboardAdmin, 'painel', 'Erro ao carregar o painel.');
  const painel = recurso.dados;

  const graficos = useMemo(
    () =>
      painel
        ? {
            cadastros: montarCadastrosPorMes(painel.series),
            frequencia: montarFrequencia(painel.series.frequencia_por_mes),
            porPlano: montarAlunosPorPlano(painel.alunos_por_plano),
            porProfessor: montarAlunosPorProfessor(painel.alunos_por_professor),
            ativosInativos: montarAtivosInativos(painel.series.ativos_inativos),
          }
        : null,
    [painel]
  );

  return { painel, graficos, carregando: recurso.carregando, erro: recurso.erro, recarregar: recurso.recarregar };
}
