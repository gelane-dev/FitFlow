/** Pontos de quebra do layout responsivo (Contrato-Gestao, GA-03). */
export const LARGURA_MEDIA = 768;
export const LARGURA_LARGA = 1024;
export const LARGURA_MAXIMA_CONTEUDO = 1200;

export interface LarguraTela {
  largura: number;
  /** Tablet/desktop: >= 1024. A navegação vira sidebar. */
  ehLargo: boolean;
  /** Tablet em pé ou maior: >= 768. Tabelas no lugar de cartões. */
  ehMedio: boolean;
}

export function classificarLargura(largura: number): LarguraTela {
  return { largura, ehLargo: largura >= LARGURA_LARGA, ehMedio: largura >= LARGURA_MEDIA };
}

/**
 * Colunas da `Grade` conforme a largura disponível ao conteúdo (já descontada a sidebar):
 * 1 (< 480), 2 (< 720), 3 (< 960) e 4 acima.
 */
export function colunasPorLargura(largura: number): number {
  if (largura >= 960) {
    return 4;
  }

  if (largura >= 720) {
    return 3;
  }

  return largura >= 480 ? 2 : 1;
}
