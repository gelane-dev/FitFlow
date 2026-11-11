import { buscarFrequenciaAluno } from '@/services/paineis.service';

import { useGestaoConsulta } from './useGestaoConsulta';

/** Frequência do aluno (GET /alunos/{id}/frequencia?meses=N). Descarta respostas antigas ao trocar o período. */
export function useProfessorFrequencia(alunoId: number, meses: number) {
  const consulta = useGestaoConsulta(() => buscarFrequenciaAluno(alunoId, meses), 'Erro ao carregar a frequência.', [alunoId, meses]);

  return { frequencia: consulta.dados, carregando: consulta.carregando, erro: consulta.erro, recarregar: consulta.recarregar };
}
