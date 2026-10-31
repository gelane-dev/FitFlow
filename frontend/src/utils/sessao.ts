import { Execucao } from '@/types/sessao.types';
import { lerInstante } from '@/utils/datas';

export interface GrupoExecucoes {
  exercicioId: number;
  exercicioNome: string;
  execucoes: Execucao[];
}

/** Agrupa os registros por exercício, mantendo a ordem da primeira aparição. */
export function agruparPorExercicio(execucoes: Execucao[]): GrupoExecucoes[] {
  const grupos = new Map<number, GrupoExecucoes>();

  for (const execucao of execucoes) {
    const existente = grupos.get(execucao.exercicio_id);

    if (existente) {
      existente.execucoes.push(execucao);
    } else {
      grupos.set(execucao.exercicio_id, {
        exercicioId: execucao.exercicio_id,
        exercicioNome: execucao.exercicio_nome,
        execucoes: [execucao],
      });
    }
  }

  return [...grupos.values()];
}

export interface SerieExecucao {
  /** Chave única: `${itemId}-${indice}`. */
  chave: string;
  itemId: number;
  indice: number;
  repeticoes: string;
  carga: string;
  feita: boolean;
}

export function montarSeries(
  itens: { id: number; series: number; repeticoes: number; carga: number }[]
): Record<string, SerieExecucao> {
  const series: Record<string, SerieExecucao> = {};

  for (const item of itens) {
    for (let i = 0; i < item.series; i++) {
      const chave = `${item.id}-${i}`;
      series[chave] = {
        chave,
        itemId: item.id,
        indice: i,
        repeticoes: String(item.repeticoes),
        carga: String(item.carga),
        feita: false,
      };
    }
  }

  return series;
}

/** Marca como feitas as séries já gravadas (retomada de sessão em andamento). */
export function aplicarExecucoes(
  series: Record<string, SerieExecucao>,
  execucoes: Execucao[]
): Record<string, SerieExecucao> {
  const resultado = { ...series };
  const usadas: Record<number, number> = {};

  for (const execucao of execucoes) {
    let restantes = Math.max(1, execucao.series_realizadas);

    while (restantes > 0) {
      const indice = usadas[execucao.item_ficha_id] ?? 0;
      const chave = `${execucao.item_ficha_id}-${indice}`;

      if (!resultado[chave]) {
        break;
      }

      resultado[chave] = {
        ...resultado[chave],
        repeticoes: String(execucao.repeticoes_realizadas),
        carga: String(execucao.carga_utilizada),
        feita: true,
      };
      usadas[execucao.item_ficha_id] = indice + 1;
      restantes -= 1;
    }
  }

  return resultado;
}

/**
 * Reconcilia as séries locais com o que o servidor gravou: para cada item,
 * se há mais registros que séries feitas, marca as faltantes como feitas
 * (a `chavePreferida`, a série que estava sendo enviada, primeiro).
 */
export function reconciliarSeries(
  series: Record<string, SerieExecucao>,
  execucoes: Execucao[],
  chavePreferida?: string
): Record<string, SerieExecucao> {
  const resultado = { ...series };
  const gravadas: Record<number, number> = {};

  for (const execucao of execucoes) {
    gravadas[execucao.item_ficha_id] =
      (gravadas[execucao.item_ficha_id] ?? 0) +
      Math.max(1, execucao.series_realizadas);
  }

  for (const [itemId, total] of Object.entries(gravadas)) {
    const doItem = Object.values(resultado)
      .filter((s) => s.itemId === Number(itemId))
      .sort((a, b) => a.indice - b.indice);
    let deficit = total - doItem.filter((s) => s.feita).length;
    const pendentes = doItem.filter((s) => !s.feita);

    // A série que estava em envio vem primeiro.
    pendentes.sort(
      (a, b) =>
        Number(b.chave === chavePreferida) - Number(a.chave === chavePreferida)
    );

    for (const serie of pendentes) {
      if (deficit <= 0) {
        break;
      }

      resultado[serie.chave] = { ...serie, feita: true };
      deficit -= 1;
    }
  }

  return resultado;
}

/** Aceita vírgula decimal. Retorna null se inválido. */
export function lerNumero(texto: string): number | null {
  const valor = Number(texto.trim().replace(',', '.'));

  return texto.trim() !== '' && Number.isFinite(valor) && valor >= 0
    ? valor
    : null;
}

/** Volume (kg) das séries já concluídas: repetições × carga de cada uma. */
export function volumeDasSeries(series: Record<string, SerieExecucao>): number {
  return Object.values(series).reduce((total, serie) => {
    if (!serie.feita) {
      return total;
    }

    const repeticoes = lerNumero(serie.repeticoes);
    const carga = lerNumero(serie.carga);

    return total + (repeticoes ?? 0) * (carga ?? 0);
  }, 0);
}

/** Soma `passo` ao valor do campo (aceita vírgula); nunca abaixo de zero. Texto inválido vira 0 + passo. */
export function ajustarCampo(texto: string, passo: number): string {
  const atual = lerNumero(texto) ?? 0;
  const novo = Math.max(0, Math.round((atual + passo) * 100) / 100);

  return String(novo);
}

/**
 * Minutos (mínimo 1) do início da sessão, como o servidor a registrou, até `agora`.
 * É a mesma base do histórico (`duracao_segundos`), então o Resumo e o histórico concordam
 * mesmo quando o treino foi interrompido e retomado.
 */
export function minutosDesde(iniciadaEm: string, agora: number = Date.now()): number {
  const inicio = lerInstante(iniciadaEm);

  if (!Number.isFinite(inicio)) {
    return 1;
  }

  return Math.max(1, Math.round(Math.max(0, agora - inicio) / 60000));
}
