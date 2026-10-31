import { dataBrValida } from '@/utils/datas';
import { lerNumero } from '@/utils/vigencia';

/** Mensagens de erro por campo (chaves ausentes = campo válido). */
export type Erros<K extends string> = Partial<Record<K, string>>;

export type CampoExercicio = 'nome' | 'descricao' | 'grupo';

export function validarExercicio(campos: {
  nome: string;
  descricao: string;
  grupo: string;
}): Erros<CampoExercicio> {
  const erros: Erros<CampoExercicio> = {};

  if (!campos.nome.trim()) {
    erros.nome = 'Informe o nome do exercício.';
  }

  if (!campos.descricao.trim()) {
    erros.descricao = 'Informe a descrição do exercício.';
  }

  if (!campos.grupo.trim()) {
    erros.grupo = 'Informe o grupo muscular.';
  }

  return erros;
}

export type CampoFicha = 'nome' | 'aluno' | 'dataInicio' | 'dataFim';

export function validarFicha(campos: {
  nome: string;
  alunoId?: number | null;
  exigirAluno?: boolean;
  /** Datas digitadas em DD/MM/AAAA (vazio = opcional). */
  dataInicio: string;
  dataFim: string;
}): Erros<CampoFicha> {
  const erros: Erros<CampoFicha> = {};

  if (!campos.nome.trim()) {
    erros.nome = 'Informe o nome da ficha.';
  }

  if (campos.exigirAluno && !campos.alunoId) {
    erros.aluno = 'Selecione o aluno.';
  }

  if (!dataBrValida(campos.dataInicio)) {
    erros.dataInicio = 'Use o formato DD/MM/AAAA.';
  }

  if (!dataBrValida(campos.dataFim)) {
    erros.dataFim = 'Use o formato DD/MM/AAAA.';
  }

  return erros;
}

export type CampoTreino = 'nome' | 'ordem';

export function validarTreino(campos: {
  nome: string;
  ordem: string;
}): Erros<CampoTreino> {
  const erros: Erros<CampoTreino> = {};

  if (!campos.nome.trim()) {
    erros.nome = 'Informe o nome do treino.';
  }

  const ordem = Number(campos.ordem);

  if (!ordem || ordem < 1) {
    erros.ordem = 'Informe uma ordem válida.';
  }

  return erros;
}

export type CampoItem =
  | 'exercicio'
  | 'series'
  | 'repeticoes'
  | 'carga'
  | 'descanso'
  | 'ordem';

/**
 * Valida séries, repetições, carga e descanso de um item de treino (e a ordem,
 * quando informada). Com `exigirExercicio`, exige também o exercício escolhido
 * (rascunho de item novo).
 */
export function validarItem(campos: {
  series: string;
  repeticoes: string;
  carga: string;
  descanso: string;
  ordem?: string;
  exercicioId?: number | null;
  exigirExercicio?: boolean;
}): Erros<CampoItem> {
  const erros: Erros<CampoItem> = {};

  if (campos.exigirExercicio && !campos.exercicioId) {
    erros.exercicio = 'Selecione um exercício.';
  }

  if (!(lerNumero(campos.series) >= 1)) {
    erros.series = 'Informe as séries.';
  }

  if (!(lerNumero(campos.repeticoes) >= 1)) {
    erros.repeticoes = 'Informe as repetições.';
  }

  // Carga é opcional: vazio vale 0 (peso do corpo). Se digitada, precisa ser um número ≥ 0.
  if (campos.carga.trim() !== '' && !(lerNumero(campos.carga) >= 0)) {
    erros.carga = 'Informe a carga.';
  }

  if (!(lerNumero(campos.descanso) >= 1)) {
    erros.descanso = 'Informe o descanso em segundos.';
  }

  if (campos.ordem !== undefined && !(lerNumero(campos.ordem) >= 1)) {
    erros.ordem = 'Informe uma ordem válida.';
  }

  return erros;
}

/** Carga digitada como número; vazio vale 0. */
export function lerCarga(texto: string): number {
  const valor = lerNumero(texto);

  return Number.isFinite(valor) ? valor : 0;
}

/** Há ao menos um erro? */
export function temErros(erros: Record<string, string | undefined>): boolean {
  return Object.values(erros).some(Boolean);
}

/** E-mail com formato plausível (algo@dominio.tld); a validação final é do servidor. */
export function emailValido(texto: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto.trim());
}

export type CampoLogin = 'email' | 'senha';

export function validarLogin(campos: { email: string; senha: string }): Erros<CampoLogin> {
  const erros: Erros<CampoLogin> = {};

  if (!campos.email.trim()) {
    erros.email = 'Informe seu e-mail.';
  } else if (!emailValido(campos.email)) {
    erros.email = 'Informe um e-mail válido (ex.: nome@email.com).';
  }

  if (!campos.senha) {
    erros.senha = 'Informe sua senha.';
  }

  return erros;
}

/** O backend (PUT /perfil/senha) não impõe tamanho mínimo; o cliente só exige a senha preenchida. */
export const TAMANHO_MINIMO_SENHA = 1;

export type CampoTrocaSenha = 'senhaAtual' | 'novaSenha' | 'confirmacao';

export function validarTrocaSenha(campos: {
  senhaAtual: string;
  novaSenha: string;
  confirmacao: string;
}): Erros<CampoTrocaSenha> {
  const erros: Erros<CampoTrocaSenha> = {};

  if (!campos.senhaAtual) {
    erros.senhaAtual = 'Informe a senha atual.';
  }

  if (campos.novaSenha.length < TAMANHO_MINIMO_SENHA) {
    erros.novaSenha = 'Informe a nova senha.';
  }

  if (campos.confirmacao !== campos.novaSenha) {
    erros.confirmacao = 'A confirmação precisa ser igual à nova senha.';
  }

  return erros;
}
