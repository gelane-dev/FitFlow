import type { PermissaoRecepcao } from '@/types/gestao.types';
import { dataBrParaIso, dataBrValida } from '@/utils/datas';
import { emailValido, Erros } from '@/utils/validacaoFormularios';

/** Lista de permissões (ou `null` enquanto carrega) tem a permissão pedida? Sem lista = não. */
export function temPermissao(
  permissoes: readonly PermissaoRecepcao[] | null | undefined,
  permissao: PermissaoRecepcao
): boolean {
  return !!permissoes && permissoes.includes(permissao);
}

/** "12345678901" → "123.456.789-01" (máscara de digitação; guarda até 11 dígitos). */
export function mascararCpf(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 11);

  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;

  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Vazio é aceito (opcional); preenchido precisa de 11 dígitos. */
export function cpfValido(texto: string): boolean {
  const digitos = texto.replace(/\D/g, '');

  return digitos.length === 0 || digitos.length === 11;
}

export type CampoAluno =
  | 'nome'
  | 'email'
  | 'senha'
  | 'telefone'
  | 'dataNascimento'
  | 'cpf';

export interface DadosFormularioAluno {
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  /** DD/MM/AAAA. */
  dataNascimento: string;
  cpf: string;
  endereco: string;
  observacoes: string;
}

export const TAMANHO_MINIMO_SENHA_ALUNO = 6;

/**
 * Valida o formulário de aluno. No modo `editar` o e-mail e a senha não são exigidos
 * (o e-mail não muda em PUT /gestao/alunos/{id} e a senha não existe).
 */
export function validarFormularioAluno(
  dados: DadosFormularioAluno,
  modo: 'criar' | 'editar'
): Erros<CampoAluno> {
  const erros: Erros<CampoAluno> = {};

  if (!dados.nome.trim()) {
    erros.nome = 'Informe o nome.';
  }

  if (modo === 'criar') {
    if (!dados.email.trim()) {
      erros.email = 'Informe o e-mail.';
    } else if (!emailValido(dados.email)) {
      erros.email = 'Informe um e-mail válido (ex.: nome@email.com).';
    }

    if (dados.senha.length < TAMANHO_MINIMO_SENHA_ALUNO) {
      erros.senha = `A senha precisa ter ao menos ${TAMANHO_MINIMO_SENHA_ALUNO} caracteres.`;
    }
  }

  if (dados.telefone.replace(/\D/g, '').length < 8) {
    erros.telefone = 'Informe o telefone com DDD.';
  }

  if (!dados.dataNascimento.trim()) {
    erros.dataNascimento = 'Informe a data de nascimento.';
  } else if (!dataBrValida(dados.dataNascimento)) {
    erros.dataNascimento = 'Use uma data válida no formato DD/MM/AAAA.';
  } else {
    const iso = dataBrParaIso(dados.dataNascimento);

    if (iso && iso > hojeIso()) {
      erros.dataNascimento = 'A data de nascimento não pode estar no futuro.';
    }
  }

  if (!cpfValido(dados.cpf)) {
    erros.cpf = 'O CPF precisa ter 11 dígitos.';
  }

  return erros;
}

export type CampoPagamento = 'forma' | 'valor' | 'descricao' | 'aluno' | 'motivo';

/**
 * Valida o recebimento de um pagamento pendente. `valor` é o decimal do CampoMoeda
 * (`null` = vazio, e vazio vale o valor do pagamento no servidor, então é aceito).
 */
export function validarRecebimento(campos: {
  forma: string | null;
  valor: string | null;
}): Erros<CampoPagamento> {
  const erros: Erros<CampoPagamento> = {};

  if (!campos.forma) {
    erros.forma = 'Selecione a forma de pagamento.';
  }

  if (campos.valor !== null && !(Number(campos.valor) > 0)) {
    erros.valor = 'O valor recebido precisa ser maior que zero.';
  }

  return erros;
}

/** Valida o pagamento avulso (aluno, descrição, valor > 0 e forma). */
export function validarAvulso(campos: {
  alunoId: number | null;
  descricao: string;
  valor: string | null;
  forma: string | null;
}): Erros<CampoPagamento> {
  const erros: Erros<CampoPagamento> = {};

  if (!campos.alunoId) {
    erros.aluno = 'Selecione o aluno.';
  }

  if (!campos.descricao.trim()) {
    erros.descricao = 'Informe a descrição.';
  }

  if (campos.valor === null || !(Number(campos.valor) > 0)) {
    erros.valor = 'Informe um valor maior que zero.';
  }

  if (!campos.forma) {
    erros.forma = 'Selecione a forma de pagamento.';
  }

  return erros;
}

/** Motivo obrigatório (cancelar matrícula, estornar pagamento). */
export function validarMotivo(motivo: string): Erros<'motivo'> {
  return motivo.trim() ? {} : { motivo: 'Informe o motivo.' };
}

/** Hoje como YYYY-MM-DD no fuso do aparelho (para o filtro "pagos hoje" etc.). */
export function hojeIso(agora: Date = new Date()): string {
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');

  return `${agora.getFullYear()}-${mes}-${dia}`;
}

/** "2026-11-09T10:30:00-03:00" → "10:30" (a hora que veio da API, sem converter fuso). */
export function horaDaApi(dataHora: string | null | undefined): string {
  const encontrada = /T(\d{2}:\d{2})/.exec(dataHora ?? '');

  return encontrada ? encontrada[1] : '—';
}

/**
 * Código único que resume a situação do aluno no selo: desativado > cadastro pendente/recusado >
 * situação da matrícula. A inadimplência aparece em selo à parte.
 */
export function situacaoPrincipalAluno(aluno: {
  ativo: boolean;
  status_cadastro: 'pendente' | 'aprovado' | 'recusado';
  situacao: string;
}): string {
  if (!aluno.ativo) return 'desativado';
  if (aluno.status_cadastro === 'pendente') return 'pendente';
  if (aluno.status_cadastro === 'recusado') return 'recusado';

  return aluno.situacao;
}
