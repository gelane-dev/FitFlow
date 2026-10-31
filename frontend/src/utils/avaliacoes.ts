import { AvaliacaoResposta } from '@/types/avaliacao.types';

/** peso / altura² (altura em metros), 2 casas. */
export function calcularImc(peso: number, altura: number): number {
  if (altura <= 0) {
    return 0;
  }

  return Math.round((peso / (altura * altura)) * 100) / 100;
}

/** Diferença de peso (kg) em relação à avaliação anterior; null se não há anterior. */
export function variacaoPeso(
  atual: AvaliacaoResposta,
  anterior: AvaliacaoResposta | undefined
): number | null {
  if (!anterior) {
    return null;
  }

  return Math.round((atual.peso - anterior.peso) * 10) / 10;
}

export function formatarVariacao(variacao: number | null): string {
  if (variacao === null) {
    return 'Primeira avaliação';
  }

  if (variacao === 0) {
    return 'Peso inalterado';
  }

  const sinal = variacao > 0 ? '+' : '−';

  return `${sinal}${Math.abs(variacao).toFixed(1).replace('.', ',')} kg`;
}

/** Recebe avaliações em qualquer ordem e devolve (desc) com a variação vs a anterior no tempo. */
export function montarLinhasAvaliacao(avaliacoes: AvaliacaoResposta[]) {
  const ordenadas = [...avaliacoes].sort((a, b) =>
    b.data_avaliacao.localeCompare(a.data_avaliacao)
  );

  return ordenadas.map((avaliacao, i) => ({
    avaliacao,
    imc: avaliacao.imc ?? calcularImc(avaliacao.peso, avaliacao.altura),
    variacao: variacaoPeso(avaliacao, ordenadas[i + 1]),
  }));
}

export type TomVariacao = 'melhora' | 'piora' | 'neutro';

/** Seta e tom da variação de peso: queda = melhora, alta = atenção, igual/sem anterior = neutro. */
export function setaVariacao(variacao: number | null): { seta: string; tom: TomVariacao } {
  if (variacao === null || variacao === 0) {
    return { seta: variacao === 0 ? '=' : '', tom: 'neutro' };
  }

  return variacao < 0 ? { seta: '↓', tom: 'melhora' } : { seta: '↑', tom: 'piora' };
}
