import { SessaoResumo } from '@/types/sessao.types';

/** Estimativa simples: tempo médio de uma série em execução (segundos). */
export const TEMPO_MEDIO_SERIE_S = 40;

export const LETRAS_SEMANA = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] as const;

/** Soma de séries × (tempo médio da série + descanso), em minutos (mínimo 1; 0 sem séries). */
export function estimarDuracaoMin(itens: { series: number; descanso: number }[]): number {
  const segundos = itens.reduce(
    (total, item) =>
      total + Math.max(0, item.series) * (TEMPO_MEDIO_SERIE_S + Math.max(0, item.descanso)),
    0
  );

  return segundos === 0 ? 0 : Math.max(1, Math.round(segundos / 60));
}

/** Data local como "AAAA-MM-DD". */
export function chaveDia(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');

  return `${data.getFullYear()}-${mes}-${dia}`;
}

export interface DiaDaSemana {
  chave: string;
  letra: string;
  hoje: boolean;
}

/** Os 7 dias (segunda a domingo) da semana que contém `hoje`. */
export function diasDaSemana(hoje: Date): DiaDaSemana[] {
  const deslocamento = (hoje.getDay() + 6) % 7; // segunda = 0
  const chaveHoje = chaveDia(hoje);

  return LETRAS_SEMANA.map((letra, i) => {
    const dia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - deslocamento + i);
    const chave = chaveDia(dia);

    return { chave, letra, hoje: chave === chaveHoje };
  });
}

/** Dias ("AAAA-MM-DD") com pelo menos uma sessão finalizada. */
export function diasComTreino(sessoes: SessaoResumo[]): Set<string> {
  return new Set(sessoes.filter((s) => s.finalizada_em).map((s) => s.iniciada_em.slice(0, 10)));
}

/** Sessões finalizadas no mês de `hoje`. */
export function sessoesDoMes(sessoes: SessaoResumo[], hoje: Date): SessaoResumo[] {
  const prefixo = chaveDia(hoje).slice(0, 7);

  return sessoes.filter((s) => s.finalizada_em && s.iniciada_em.startsWith(prefixo));
}

/** Volume (kg) somado das sessões informadas, direto de `volume_total` da listagem. */
export function volumeDasSessoes(sessoes: SessaoResumo[]): number {
  return sessoes.reduce((total, s) => total + s.volume_total, 0);
}

/** Dias seguidos com treino. Se hoje ainda não treinou, a contagem parte de ontem. */
export function sequenciaDias(sessoes: SessaoResumo[], hoje: Date): number {
  const dias = diasComTreino(sessoes);
  const cursor = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  if (!dias.has(chaveDia(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let total = 0;

  while (dias.has(chaveDia(cursor))) {
    total += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return total;
}

/** 12450 → "12.450" (agrupamento de milhar pt-BR). */
export function formatarVolume(volume: number): string {
  return String(Math.round(volume)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

const DIAS_PT = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** Nome do dia da semana de `data`, no formato do backend ("terça"). */
export function nomeDiaSemana(data: Date): string {
  return DIAS_PT[data.getDay()];
}

const ORDEM_DIAS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

/** Quantos dias faltam (1 a 7) da data `hoje` até o dia da semana `dia`; 7 = mesmo dia na semana que vem. */
export function diasAte(dia: string, hoje: Date): number {
  const alvo = ORDEM_DIAS.indexOf(dia);
  const atual = (hoje.getDay() + 6) % 7;

  if (alvo < 0) {
    return Infinity;
  }

  return ((alvo - atual + 6) % 7) + 1;
}

/** Próximo treino da ficha depois de hoje (o de hoje não conta). Sem treinos, null. */
export function proximoTreino<T extends { dia_semana: string }>(
  treinos: T[],
  hoje: Date
): { treino: T; emDias: number } | null {
  let melhor: { treino: T; emDias: number } | null = null;

  for (const treino of treinos) {
    const emDias = diasAte(treino.dia_semana, hoje);

    if (Number.isFinite(emDias) && (melhor === null || emDias < melhor.emDias)) {
      melhor = { treino, emDias };
    }
  }

  return melhor;
}

/** 1 → "amanhã"; 3 → "em 3 dias". */
export function descreverEmDias(dias: number): string {
  return dias === 1 ? 'amanhã' : `em ${dias} dias`;
}

/**
 * Sessão ainda aberta (sem `finalizada_em`) mais recente. Com `treinoId`, só a daquele treino.
 * Vale para qualquer treino, não só o de hoje (QA P-D).
 */
export function sessaoAberta(sessoes: SessaoResumo[], treinoId?: number): SessaoResumo | undefined {
  return sessoes
    .filter((s) => !s.finalizada_em && (treinoId === undefined || s.treino_id === treinoId))
    .sort((a, b) => b.iniciada_em.localeCompare(a.iniciada_em))[0];
}

/** Última sessão finalizada hoje do treino informado; undefined se não houver. */
export function sessaoConcluidaHoje(
  sessoes: SessaoResumo[],
  treinoId: number,
  hoje: Date
): SessaoResumo | undefined {
  const chave = chaveDia(hoje);

  return sessoes
    .filter((s) => s.treino_id === treinoId && s.finalizada_em && s.iniciada_em.slice(0, 10) === chave)
    .sort((a, b) => b.iniciada_em.localeCompare(a.iniciada_em))[0];
}
