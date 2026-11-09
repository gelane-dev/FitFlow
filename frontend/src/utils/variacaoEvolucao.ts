import { formatarNumeroBr } from './numeros';

/** Para onde o valor deve ir para ser bom: subir, cair ou tanto faz (peso, IMC). */
export type DirecaoFavoravel = 'alta' | 'queda' | 'neutra';

export type TomVariacaoEvolucao = 'favoravel' | 'desfavoravel' | 'neutro';

export interface Variacao {
  /** atual − anterior, em até 2 casas. */
  absoluta: number;
  /** (atual − anterior) / anterior × 100, em até 1 casa; `null` quando o anterior é 0. */
  percentual: number | null;
  sentido: 'subiu' | 'caiu' | 'igual';
}

/** `null` quando não há valor anterior (primeiro registro). */
export function calcularVariacao(atual: number, anterior: number | null | undefined): Variacao | null {
  if (anterior === null || anterior === undefined) {
    return null;
  }

  const absoluta = Math.round((atual - anterior) * 100) / 100;
  const percentual = anterior === 0 ? null : Math.round(((atual - anterior) / anterior) * 1000) / 10;

  return {
    absoluta,
    percentual,
    sentido: absoluta > 0 ? 'subiu' : absoluta < 0 ? 'caiu' : 'igual',
  };
}

export function tomDaVariacao(variacao: Variacao | null, direcao: DirecaoFavoravel): TomVariacaoEvolucao {
  if (variacao === null || variacao.sentido === 'igual' || direcao === 'neutra') {
    return 'neutro';
  }

  const favoravel = direcao === 'alta' ? variacao.sentido === 'subiu' : variacao.sentido === 'caiu';

  return favoravel ? 'favoravel' : 'desfavoravel';
}

export function setaDaVariacao(variacao: Variacao): string {
  return variacao.sentido === 'subiu' ? '↑' : variacao.sentido === 'caiu' ? '↓' : '=';
}

function comSinal(valor: number): string {
  if (valor === 0) {
    return '0';
  }

  return `${valor > 0 ? '+' : '−'}${formatarNumeroBr(Math.abs(valor))}`;
}

/** "+2,5 kg", "−1 kg", "0 kg"; a unidade é opcional (IMC). */
export function formatarDiferenca(absoluta: number, unidade?: string): string {
  const numero = comSinal(absoluta);

  return unidade ? `${numero} ${unidade}` : numero;
}

/** "+12,5%", "−3%"; `null` vira "—" (anterior igual a zero). */
export function formatarPercentual(percentual: number | null): string {
  return percentual === null ? '—' : `${comSinal(percentual)}%`;
}
