export interface Execucao {
  id: number;
  sessao_id: number | null;
  item_ficha_id: number;
  exercicio_id: number;
  exercicio_nome: string;
  data_execucao: string;
  series_realizadas: number;
  repeticoes_realizadas: number;
  carga_utilizada: number;
  observacao: string | null;
}

export interface SessaoResumo {
  id: number;
  treino_id: number;
  treino_nome: string;
  ficha_id: number;
  iniciada_em: string;
  finalizada_em: string | null;
  esforco: number | null;
  comentario: string | null;
  total_execucoes: number;
  /** Soma das séries realizadas. */
  total_series: number;
  /** Soma de séries × repetições × carga (kg). */
  volume_total: number;
  /** Segundos do início à finalização; null se em andamento. */
  duracao_segundos: number | null;
}

export interface SessaoResposta extends SessaoResumo {
  execucoes: Execucao[];
}

export interface ExecucaoCriar {
  item_ficha_id: number;
  series_realizadas: number;
  repeticoes_realizadas: number;
  carga_utilizada: number;
  observacao?: string | null;
}

export interface SessaoFinalizar {
  esforco?: number;
  comentario?: string;
}
