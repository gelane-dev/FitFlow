export interface EvolucaoExercicioResumo {
  exercicio_id: number;
  nome: string;
  grupo_muscular: string;
  total_registros: number;
  ultima_carga: number;
  carga_maxima: number;
  ultima_data: string;
}

export interface PontoEvolucao {
  data: string;
  carga_maxima: number;
  volume: number;
  registros: number;
  /** Maior repetição realizada no dia (EV-01). */
  repeticoes_maximas: number;
  /** Soma das séries realizadas no dia (EV-01). */
  series: number;
}

/** Dia mais recente e o dia anterior com registro, sobre TODO o histórico (ignora o período). */
export interface ComparacaoEvolucao {
  atual: PontoEvolucao;
  anterior: PontoEvolucao | null;
}

export interface EvolucaoExercicio {
  exercicio_id: number;
  nome: string;
  /** Eco do parâmetro `periodo`; `null` quando a chamada não enviou período. */
  periodo?: PeriodoEvolucao | null;
  pontos: PontoEvolucao[];
  comparacao?: ComparacaoEvolucao | null;
}

/** Janela do `GET /evolucao/exercicios/{id}?periodo=`; ausente = todo o histórico. */
export type PeriodoEvolucao = '7d' | '30d' | '3m' | '6m' | '1a';

/** Métricas do gráfico de barras (professor e detalhe do exercício). */
export type MetricaEvolucao = 'carga_maxima' | 'volume';

/** Métricas do gráfico de linha da aba Evolução. */
export type MetricaTreino = 'carga_maxima' | 'repeticoes_maximas' | 'volume';
