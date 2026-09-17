export interface Exercicio {
  id: number;
  nome: string;
  descricao: string;
  grupo_muscular: string;
  imagem: string | null;
  video: string | null;
}

export interface ExercicioCriar {
  nome: string;
  descricao: string;
  grupo_muscular: string;
}

export interface ExercicioAtualizar {
  nome: string;
  descricao: string;
  grupo_muscular: string;
}