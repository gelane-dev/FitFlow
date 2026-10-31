export interface AvaliacaoCriar {
  data_avaliacao: string;
  peso: number;
  altura: number;
  percentual_gordura?: number | null;
  massa_muscular?: number | null;
  observacao?: string | null;
}

export interface AvaliacaoResposta extends AvaliacaoCriar {
  id: number;
  aluno_id: number;
  professor_id: number | null;
  imc: number;
}
