import { MetricaEvolucao, PontoEvolucao } from '@/types/evolucao.types';
import { formatarDecimal } from './numeros';

export interface BarraGrafico {
  data: string;
  valor: number;
  /** Altura relativa de 0 a 1 (o maior valor da série = 1). */
  proporcao: number;
}

export function montarBarras(
  pontos: PontoEvolucao[],
  metrica: MetricaEvolucao
): BarraGrafico[] {
  const maximo = pontos.reduce((m, p) => Math.max(m, p[metrica]), 0);

  return pontos.map((p) => ({
    data: p.data,
    valor: p[metrica],
    proporcao: maximo > 0 ? p[metrica] / maximo : 0,
  }));
}

/** "2026-10-30" ou ISO datetime → "30/10". */
export function formatarDataCurta(data: string): string {
  const [ano, mes, dia] = data.slice(0, 10).split('-');

  return ano && mes && dia ? `${dia}/${mes}` : data;
}

export { formatarData } from './datas';

/** "2026-10-30T08:05:00" → "08:05". */
export function formatarHora(data: string): string {
  return data.length >= 16 ? data.slice(11, 16) : '';
}

export function formatarNumero(valor: number): string {
  return Number.isInteger(valor) ? String(valor) : formatarDecimal(valor, 1);
}

/** Largura de cada coluna do gráfico: divide a área toda, mas nunca abaixo de `minima` (aí rola). */
export function larguraColuna(larguraArea: number, quantidade: number, minima = 48): number {
  if (quantidade <= 0 || larguraArea <= 0) {
    return minima;
  }

  return Math.max(minima, Math.floor(larguraArea / quantidade));
}
