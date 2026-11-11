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

export type StatusFicha = 'rascunho' | 'publicada';

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
  objetivo?: string | null;
  status?: StatusFicha;
  atualizado_em?: string | null;
}

export interface FichaCriar {
  aluno_id: number;
  nome: string;
  data_inicio?: string;
  data_fim?: string | null;
  objetivo?: string | null;
  /** Padrão no servidor: publicada. */
  status?: StatusFicha;
}

export interface FichaAtualizar {
  nome: string;
  data_inicio?: string;
  data_fim?: string | null;
  objetivo?: string | null;
}

export interface Treino {
  id: number;
  ficha_id: number;
  nome: string;
  /** `null` na divisão A/B/C sem dia fixo. */
  dia_semana: DiaSemana | null;
  ordem: number;
  /** Itens ativos do treino. */
  total_itens: number;
}

export interface TreinoCriar {
  ficha_id: number;
  nome: string;
  /** Opcional: divisão A/B/C sem dia fixo. */
  dia_semana?: DiaSemana | null;
  ordem: number;
}

export interface TreinoAtualizar {
  nome: string;
  dia_semana?: DiaSemana | null;
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
  observacao?: string | null;
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
  observacao?: string | null;
}

export interface ItemFichaAtualizar {
  series: number;
  repeticoes: number;
  carga: number;
  descanso: number;
  ordem: number;
  observacao?: string | null;
}

/** Item no estado completo da ficha (PUT /ficha/{id}/completa): com `id` atualiza, sem `id` cria. */
export interface ItemFichaCompletaAtualizar {
  id?: number;
  exercicio_id: number;
  series: number;
  repeticoes: number;
  carga: number;
  descanso: number;
  ordem: number;
  observacao?: string | null;
}

export interface TreinoFichaCompletaAtualizar {
  id?: number;
  nome: string;
  dia_semana: DiaSemana | null;
  ordem: number;
  itens: ItemFichaCompletaAtualizar[];
}

/** Estado completo da ficha: o que não vier é removido (exclusão lógica). */
export interface FichaCompletaAtualizar extends FichaAtualizar {
  treinos: TreinoFichaCompletaAtualizar[];
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


/** Treino com os itens ativos (GET /ficha/{id}/completa e conteúdo de versão). */
export interface TreinoCompleto {
  id: number;
  ficha_id: number;
  nome: string;
  dia_semana: DiaSemana | null;
  ordem: number;
  total_itens: number;
  itens: ItemFicha[];
}

/** Ficha com treinos e itens ativos, para o montador web. */
export interface FichaCompleta {
  id: number;
  nome: string;
  professor_nome?: string | null;
  data_criacao: string;
  data_inicio: string;
  data_fim: string | null;
  vigente: boolean;
  treinos: TreinoCompleto[];
  aluno_id?: number | null;
  status?: StatusFicha;
  objetivo?: string | null;
  atualizado_em?: string | null;
}
