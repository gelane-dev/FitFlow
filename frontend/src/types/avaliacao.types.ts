export interface AvaliacaoCriar {
  data_avaliacao: string;
  peso: number;
  altura: number;
  percentual_gordura?: number | null;
  massa_muscular?: number | null;
  observacao?: string | null;
  /** Circunferências em cm (> 0 e ≤ 300). */
  cintura?: number | null;
  quadril?: number | null;
  abdomen?: number | null;
  peito?: number | null;
  braco_direito?: number | null;
  braco_esquerdo?: number | null;
  coxa_direita?: number | null;
  coxa_esquerda?: number | null;
  panturrilha?: number | null;
}

export interface AvaliacaoResposta extends AvaliacaoCriar {
  id: number;
  aluno_id: number;
  professor_id: number | null;
  imc: number;
}
