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
}

export interface EvolucaoExercicio {
  exercicio_id: number;
  nome: string;
  pontos: PontoEvolucao[];
}

export type MetricaEvolucao = 'carga_maxima' | 'volume';
