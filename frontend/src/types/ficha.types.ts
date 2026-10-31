export type DiaSemana =
  | 'segunda'
  | 'terça'
  | 'quarta'
  | 'quinta'
  | 'sexta'
  | 'sábado'
  | 'domingo';

export const DIAS_SEMANA: DiaSemana[] = [
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
  'domingo',
];

export interface AlunoLista {
  id: number;
  nome: string;
  telefone: string;
  data_nascimento: string;
}

export interface FichaLista {
  id: number;
  nome: string;
  data_criacao: string;
  aluno_id: number;
  aluno_nome: string;
  data_inicio: string | null;
  data_fim: string | null;
  vigente: boolean;
  /** Treinos ativos da ficha (GET /ficha, /ficha/professor/{id}). */
  total_treinos: number;
}

export interface FichaCriar {
  aluno_id: number;
  nome: string;
  data_inicio?: string;
  data_fim?: string | null;
}

export interface FichaAtualizar {
  nome: string;
  data_inicio?: string;
  data_fim?: string | null;
}

export interface Treino {
  id: number;
  ficha_id: number;
  nome: string;
  dia_semana: DiaSemana;
  ordem: number;
  /** Itens ativos do treino. */
  total_itens: number;
}

export interface TreinoCriar {
  ficha_id: number;
  nome: string;
  dia_semana: DiaSemana;
  ordem: number;
}

export interface TreinoAtualizar {
  nome: string;
  dia_semana: DiaSemana;
  ordem: number;
}

export interface ItemFicha {
  id: number;
  ficha_id: number;
  treino_id: number;
  exercicio_id: number;
  series: number;
  repeticoes: number;
  carga: number;
  descanso: number;
  ordem: number;
  nome: string;
  descricao: string;
  grupo_muscular: string;
  imagem: string | null;
  video: string | null;
}

export interface ItemFichaCriar {
  ficha_id: number;
  treino_id: number;
  exercicio_id: number;
  series: number;
  repeticoes: number;
  carga: number;
  descanso: number;
  ordem: number;
}

export interface ItemFichaAtualizar {
  series: number;
  repeticoes: number;
  carga: number;
  descanso: number;
  ordem: number;
}

export interface RascunhoItem {
  chave: string;
  exercicioId: number | null;
  exercicioNome: string;
  grupoMuscular: string;
  series: string;
  repeticoes: string;
  carga: string;
  descanso: string;
}
