export interface Exercicio {
  id: number;
  nome: string;
  descricao: string;
  grupo_muscular: string;
  imagem: string | null;
  video: string | null;
  instrucoes?: string | null;
  /** Nulo = biblioteca da academia. */
  criado_por_professor_id?: number | null;
}

export interface ExercicioCriar {
  nome: string;
  descricao: string;
  grupo_muscular: string;
  instrucoes?: string | null;
}

export interface ExercicioAtualizar {
  nome: string;
  descricao: string;
  grupo_muscular: string;
  instrucoes?: string | null;
}

export type OrigemExercicio = 'biblioteca' | 'meus';

export interface ExerciciosListaResposta {
  itens: Exercicio[];
  pagina: number;
  limite: number;
  total: number;
  total_paginas: number;
}