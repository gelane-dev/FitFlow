import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { NomeCor } from '@/theme';
import type {
  FormaPagamento,
  MotivoBloqueio,
  ResultadoAcesso,
  SituacaoAluno,
  SituacaoMatricula,
  StatusCadastro,
  StatusMatricula,
  StatusPagamento,
} from '@/types/gestao.types';
import type { StatusFicha } from '@/types/ficha.types';

export type NomeIcone = ComponentProps<typeof Ionicons>['name'];

export type TomSituacao = 'sucesso' | 'aviso' | 'perigo' | 'neutro';

export interface InfoSituacao {
  rotulo: string;
  tom: TomSituacao;
  icone: NomeIcone;
}

/** Chave de token de `src/theme` (cores.*) para cada tom. Nunca hexadecimal. */
const COR_DO_TOM: Record<TomSituacao, NomeCor> = {
  sucesso: 'sucesso',
  aviso: 'aviso',
  perigo: 'perigo',
  neutro: 'textoSecundario',
};

export function corDoTom(tom: TomSituacao): NomeCor {
  return COR_DO_TOM[tom];
}

const NEUTRO_DESCONHECIDO: Omit<InfoSituacao, 'rotulo'> = {
  tom: 'neutro',
  icone: 'help-circle-outline',
};

function consultar<C extends string>(
  tabela: Record<C, InfoSituacao>,
  codigo: string | null | undefined
): InfoSituacao {
  if (codigo && Object.prototype.hasOwnProperty.call(tabela, codigo)) {
    return tabela[codigo as C];
  }

  return { rotulo: codigo ?? '—', ...NEUTRO_DESCONHECIDO };
}

export const SITUACOES_MATRICULA: Record<SituacaoMatricula, InfoSituacao> = {
  vigente: { rotulo: 'Vigente', tom: 'sucesso', icone: 'checkmark-circle' },
  vencendo: { rotulo: 'Vencendo', tom: 'aviso', icone: 'time' },
  vencida: { rotulo: 'Vencida', tom: 'perigo', icone: 'close-circle' },
  sem_matricula: {
    rotulo: 'Sem matrícula',
    tom: 'neutro',
    icone: 'remove-circle-outline',
  },
};

export const SITUACOES_ALUNO: Record<SituacaoAluno, InfoSituacao> = {
  ...SITUACOES_MATRICULA,
  pendente: { rotulo: 'Pendente', tom: 'aviso', icone: 'hourglass' },
  desativado: { rotulo: 'Desativado', tom: 'neutro', icone: 'ban' },
  inadimplente: { rotulo: 'Inadimplente', tom: 'perigo', icone: 'alert-circle' },
};

export const STATUS_MATRICULA: Record<StatusMatricula, InfoSituacao> = {
  ativa: { rotulo: 'Ativa', tom: 'sucesso', icone: 'checkmark-circle' },
  encerrada: { rotulo: 'Encerrada', tom: 'neutro', icone: 'flag' },
  substituida: {
    rotulo: 'Substituída',
    tom: 'neutro',
    icone: 'swap-horizontal',
  },
  cancelada: { rotulo: 'Cancelada', tom: 'perigo', icone: 'close-circle' },
};

export const STATUS_PAGAMENTO: Record<StatusPagamento, InfoSituacao> = {
  pendente: { rotulo: 'Pendente', tom: 'aviso', icone: 'time' },
  pago: { rotulo: 'Pago', tom: 'sucesso', icone: 'checkmark-circle' },
  estornado: { rotulo: 'Estornado', tom: 'perigo', icone: 'return-up-back' },
  cancelado: { rotulo: 'Cancelado', tom: 'neutro', icone: 'close-circle' },
};

export const FORMAS_PAGAMENTO: Record<FormaPagamento, InfoSituacao> = {
  dinheiro: { rotulo: 'Dinheiro', tom: 'neutro', icone: 'cash-outline' },
  pix: { rotulo: 'Pix', tom: 'neutro', icone: 'qr-code-outline' },
  cartao_credito: {
    rotulo: 'Cartão de crédito',
    tom: 'neutro',
    icone: 'card-outline',
  },
  cartao_debito: {
    rotulo: 'Cartão de débito',
    tom: 'neutro',
    icone: 'card-outline',
  },
  transferencia: {
    rotulo: 'Transferência',
    tom: 'neutro',
    icone: 'swap-horizontal-outline',
  },
  outro: { rotulo: 'Outro', tom: 'neutro', icone: 'ellipsis-horizontal' },
};

export const RESULTADOS_ACESSO: Record<ResultadoAcesso, InfoSituacao> = {
  liberado: { rotulo: 'Liberado', tom: 'sucesso', icone: 'checkmark-circle' },
  bloqueado: { rotulo: 'Bloqueado', tom: 'perigo', icone: 'close-circle' },
};

export const MOTIVOS_BLOQUEIO: Record<MotivoBloqueio, InfoSituacao> = {
  conta_desativada: {
    rotulo: 'Conta desativada',
    tom: 'perigo',
    icone: 'ban',
  },
  cadastro_pendente: {
    rotulo: 'Cadastro não aprovado',
    tom: 'aviso',
    icone: 'hourglass',
  },
  restricao: { rotulo: 'Restrição', tom: 'perigo', icone: 'lock-closed' },
  sem_matricula: {
    rotulo: 'Sem matrícula ativa',
    tom: 'perigo',
    icone: 'remove-circle',
  },
  matricula_vencida: {
    rotulo: 'Matrícula vencida',
    tom: 'perigo',
    icone: 'calendar',
  },
  pagamento_pendente: {
    rotulo: 'Pagamento pendente',
    tom: 'aviso',
    icone: 'cash',
  },
};

export const STATUS_CADASTRO: Record<StatusCadastro, InfoSituacao> = {
  pendente: { rotulo: 'Pendente', tom: 'aviso', icone: 'hourglass' },
  aprovado: { rotulo: 'Aprovado', tom: 'sucesso', icone: 'checkmark-circle' },
  recusado: { rotulo: 'Recusado', tom: 'perigo', icone: 'close-circle' },
};

export const STATUS_FICHA: Record<StatusFicha, InfoSituacao> = {
  rascunho: { rotulo: 'Rascunho', tom: 'aviso', icone: 'create-outline' },
  publicada: { rotulo: 'Publicada', tom: 'sucesso', icone: 'checkmark-circle' },
};

/** Códigos desconhecidos viram um selo neutro com o próprio código como rótulo. */
export const situacaoMatricula = (c: string | null | undefined) =>
  consultar(SITUACOES_MATRICULA, c);
export const situacaoAluno = (c: string | null | undefined) =>
  consultar(SITUACOES_ALUNO, c);
export const statusMatricula = (c: string | null | undefined) =>
  consultar(STATUS_MATRICULA, c);
export const statusPagamento = (c: string | null | undefined) =>
  consultar(STATUS_PAGAMENTO, c);
export const formaPagamento = (c: string | null | undefined) =>
  consultar(FORMAS_PAGAMENTO, c);
export const resultadoAcesso = (c: string | null | undefined) =>
  consultar(RESULTADOS_ACESSO, c);
export const motivoBloqueio = (c: string | null | undefined) =>
  consultar(MOTIVOS_BLOQUEIO, c);
export const statusCadastro = (c: string | null | undefined) =>
  consultar(STATUS_CADASTRO, c);
export const statusFicha = (c: string | null | undefined) =>
  consultar(STATUS_FICHA, c);
