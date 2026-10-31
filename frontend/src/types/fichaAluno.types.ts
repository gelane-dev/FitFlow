import { DiaSemana } from '@/types/ficha.types';

/** Item como o aluno recebe em GET /ficha/{id} e GET /treino/hoje/{id}. Campos do exercício podem faltar. */
export interface ItemFichaAluno {
  id: number;
  ficha_id: number;
  treino_id: number;
  exercicio_id: number;
  series: number;
  repeticoes: number;
  carga: number;
  descanso: number;
  ordem: number;
  nome?: string;
  descricao?: string;
  grupo_muscular?: string;
  imagem?: string | null;
  video?: string | null;
}

export interface TreinoAluno {
  id: number;
  ficha_id: number;
  nome: string;
  dia_semana: DiaSemana;
  ordem: number;
  itens: ItemFichaAluno[];
}

export interface FichaAlunoLista {
  id: number;
  nome: string;
  professor_nome: string | null;
  data_criacao: string;
  data_inicio: string | null;
  data_fim: string | null;
  vigente: boolean;
}

export interface FichaAlunoCompleta extends FichaAlunoLista {
  treinos: TreinoAluno[];
}
