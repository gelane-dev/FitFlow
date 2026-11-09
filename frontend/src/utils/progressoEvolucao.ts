import { PontoGrafico } from './graficoLinha';
import { calcularVariacao, Variacao } from './variacaoEvolucao';
import { MetricaTreino, PeriodoEvolucao, PontoEvolucao } from '@/types/evolucao.types';

/** `rotulo` é curto para caber numa linha só em 320 px; `descricao` é o texto por extenso. */
export const PERIODOS_EVOLUCAO: { valor: PeriodoEvolucao | null; rotulo: string; descricao: string }[] = [
  { valor: '7d', rotulo: '7D', descricao: 'Últimos 7 dias' },
  { valor: '30d', rotulo: '30D', descricao: 'Últimos 30 dias' },
  { valor: '3m', rotulo: '3M', descricao: 'Últimos 3 meses' },
  { valor: '6m', rotulo: '6M', descricao: 'Últimos 6 meses' },
  { valor: '1a', rotulo: '1A', descricao: 'Último ano' },
  { valor: null, rotulo: 'Tudo', descricao: 'Todo o histórico' },
];

export const METRICAS_TREINO: { valor: MetricaTreino; rotulo: string; unidade: string }[] = [
  { valor: 'carga_maxima', rotulo: 'Carga', unidade: 'kg' },
  { valor: 'repeticoes_maximas', rotulo: 'Repetições', unidade: 'reps' },
  { valor: 'volume', rotulo: 'Volume', unidade: 'kg totais' },
];

/** Pontos {data, valor} da métrica escolhida, na ordem recebida (a API já entrega crescente). */
export function pontosDaMetrica(pontos: PontoEvolucao[], metrica: MetricaTreino): PontoGrafico[] {
  return pontos.map((p) => ({ data: p.data, valor: p[metrica] }));
}

export interface ProgressoPeriodo {
  inicial: PontoGrafico;
  final: PontoGrafico;
  variacao: Variacao;
}

/**
 * Do primeiro ao último ponto do período (em ordem crescente de data).
 * `null` com menos de dois pontos: não há o que comparar.
 */
export function progressoDoPeriodo(pontos: PontoGrafico[]): ProgressoPeriodo | null {
  if (pontos.length < 2) {
    return null;
  }

  const inicial = pontos[0];
  const final = pontos[pontos.length - 1];
  const variacao = calcularVariacao(final.valor, inicial.valor);

  return variacao ? { inicial, final, variacao } : null;
}
