import { Execucao, SessaoResumo } from '@/types/sessao.types';
import { lerInstante } from '@/utils/datas';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Duração em minutos de uma sessão finalizada; null se em andamento ou datas inválidas. */
export function duracaoSessaoMin(
  sessao: Pick<SessaoResumo, 'iniciada_em' | 'finalizada_em'>
): number | null {
  if (!sessao.finalizada_em) {
    return null;
  }

  const ms = lerInstante(sessao.finalizada_em) - lerInstante(sessao.iniciada_em);

  return Number.isFinite(ms) && ms >= 0 ? Math.max(1, Math.round(ms / 60000)) : null;
}

/** Segundos (`duracao_segundos` da API) em minutos, mínimo 1; null se em andamento. */
export function segundosParaMinutos(segundos: number | null): number | null {
  return segundos === null ? null : Math.max(1, Math.round(segundos / 60));
}

/** 42 → "42 min"; 65 → "1h05". */
export function formatarDuracao(minutos: number | null): string {
  if (minutos === null) {
    return '—';
  }

  if (minutos < 60) {
    return `${minutos} min`;
  }

  return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, '0')}`;
}

/** Volume (kg) = séries × repetições × carga de cada registro. */
export function volumeExecucoes(execucoes: Execucao[]): number {
  return execucoes.reduce(
    (total, e) =>
      total + Math.max(1, e.series_realizadas) * e.repeticoes_realizadas * e.carga_utilizada,
    0
  );
}

/** Total de séries registradas. */
export function totalSeries(execucoes: Execucao[]): number {
  return execucoes.reduce((total, e) => total + Math.max(1, e.series_realizadas), 0);
}

export interface GrupoSessoes {
  chave: string;
  titulo: string;
  sessoes: SessaoResumo[];
}

/** Agrupa por mês (mais recente primeiro), ordenando as sessões da mais nova para a mais antiga. */
export function agruparSessoesPorMes(sessoes: SessaoResumo[]): GrupoSessoes[] {
  const ordenadas = [...sessoes].sort((a, b) => b.iniciada_em.localeCompare(a.iniciada_em));
  const grupos: GrupoSessoes[] = [];

  for (const sessao of ordenadas) {
    const chave = sessao.iniciada_em.slice(0, 7);
    const existente = grupos.find((g) => g.chave === chave);

    if (existente) {
      existente.sessoes.push(sessao);
      continue;
    }

    const [ano, mes] = chave.split('-');
    const nomeMes = MESES[Number(mes) - 1] ?? chave;

    grupos.push({ chave, titulo: `${nomeMes} ${ano}`, sessoes: [sessao] });
  }

  return grupos;
}

export type Tendencia = 'alta' | 'queda';

/** Última carga igual à máxima = em alta (recorde); abaixo dela = em queda. */
export function tendenciaDaCarga(ultimaCarga: number, cargaMaxima: number): Tendencia {
  return ultimaCarga >= cargaMaxima ? 'alta' : 'queda';
}

/** Maior carga já registrada e a data em que foi atingida pela primeira vez; null sem pontos. */
export function recordePessoal(
  pontos: { data: string; carga_maxima: number }[]
): { carga: number; data: string } | null {
  let melhor: { carga: number; data: string } | null = null;

  for (const ponto of pontos) {
    if (melhor === null || ponto.carga_maxima > melhor.carga) {
      melhor = { carga: ponto.carga_maxima, data: ponto.data };
    }
  }

  return melhor;
}
