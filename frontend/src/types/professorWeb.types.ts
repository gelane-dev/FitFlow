/** Tipos do professor na web: dashboard, frequência, versões e duplicação de ficha. */

import { FichaCompleta } from './ficha.types';
import { DataHoraIso, DataIso, RefNome } from './gestao.types';

export interface ProfessorDashboard {
  total_alunos: number;
  alunos_ativos: number;
  avaliacoes_pendentes: number;
  fichas_ativas: number;
  fichas_rascunho: number;
  fichas_desatualizadas: number;
  ultimos_alunos: RefNome[];
  proximas_avaliacoes: {
    aluno: RefNome;
    ultima: DataIso | null;
    proxima: DataIso | null;
  }[];
}

export interface FrequenciaAluno {
  /** `semana_inicio` = segunda-feira da semana (AAAA-MM-DD). */
  entradas_por_semana: { semana_inicio: string; total: number }[];
  total_periodo: number;
  ultima_entrada: DataHoraIso | null;
  sessoes_treino_periodo: number;
}

export interface FichaVersaoResumo {
  numero: number;
  publicada_em: DataHoraIso;
  publicada_por: { id: number; nome: string | null; tipo: string };
}

export interface FichaVersaoConteudo extends FichaVersaoResumo {
  conteudo: FichaCompleta;
}

export interface FichaDuplicar {
  aluno_id?: number;
  nome?: string;
}
