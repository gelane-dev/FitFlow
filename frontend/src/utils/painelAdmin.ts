/** Montagem dos dados dos gráficos do painel e do financeiro do admin. Funções puras, sem React. */

import type {
  DashboardAdmin,
  Financeiro,
  FiltrosFinanceiro,
} from '@/types/gestao.types';

import type { DadoBarra } from './graficoBarras';
import type { PontoGrafico } from './graficoLinha';
import { formaPagamento } from './situacao';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MES_VALIDO = /^(\d{4})-(0[1-9]|1[0-2])$/;

export const ROTULO_SEM_PROFESSOR = 'Sem professor';

/** "2026-11" -> "nov/26". Texto fora do formato volta como veio. */
export function rotuloMes(mes: string): string {
  const partes = MES_VALIDO.exec(mes);

  return partes ? `${MESES[Number(partes[2]) - 1]}/${partes[1].slice(2)}` : mes;
}

/** Rótulo do eixo X de séries mensais: "2026-11-01" -> "nov/26". */
export const rotuloMesDaData = (data: string): string => rotuloMes(data.slice(0, 7));

/** "2026-11" -> "2026-11-01" (primeiro dia, para o eixo de datas do gráfico de linha). */
export function mesParaData(mes: string): string | null {
  return MES_VALIDO.test(mes) ? `${mes}-01` : null;
}

function mesesOrdenados<T extends { mes: string }>(itens: T[]): T[] {
  return itens.filter((item) => MES_VALIDO.test(item.mes)).sort((a, b) => a.mes.localeCompare(b.mes));
}

export interface SerieCadastros {
  barras: DadoBarra[];
  /** Cadastros antigos sem data de criação: aparecem à parte, nunca como zero de um mês. */
  semData: number;
  totalComData: number;
}

/**
 * Cadastros por mês em ordem cronológica. O item `sem_data` (contrato) e o campo `series.sem_data`
 * saem da série mensal e voltam como contagem separada.
 */
export function montarCadastrosPorMes(series: DashboardAdmin['series']): SerieCadastros {
  const lista = series.cadastros_por_mes ?? [];
  const itemSemData = lista.find((item) => item.mes === 'sem_data');
  const semData = itemSemData?.total ?? series.sem_data ?? 0;
  const meses = mesesOrdenados(lista);

  return {
    barras: meses.map((item) => ({ rotulo: rotuloMes(item.mes), valor: item.total })),
    semData,
    totalComData: meses.reduce((soma, item) => soma + item.total, 0),
  };
}

export interface SerieFrequencia {
  entradas: DadoBarra[];
  alunosDistintos: PontoGrafico[];
  totalEntradas: number;
}

/** Frequência mensal: entradas (barras) e alunos distintos (linha) são unidades diferentes, gráficos separados. */
export function montarFrequencia(freq: DashboardAdmin['series']['frequencia_por_mes']): SerieFrequencia {
  const meses = mesesOrdenados(freq ?? []);

  return {
    entradas: meses.map((item) => ({ rotulo: rotuloMes(item.mes), valor: item.entradas })),
    alunosDistintos: meses.map((item) => ({ data: `${item.mes}-01`, valor: item.alunos_distintos })),
    totalEntradas: meses.reduce((soma, item) => soma + item.entradas, 0),
  };
}

function maioresPrimeiro(dados: DadoBarra[]): DadoBarra[] {
  return dados
    .map((dado, indice) => ({ dado, indice }))
    .sort((a, b) => b.dado.valor - a.dado.valor || a.indice - b.indice)
    .map(({ dado }) => dado);
}

export function montarAlunosPorPlano(lista: DashboardAdmin['alunos_por_plano']): DadoBarra[] {
  return maioresPrimeiro((lista ?? []).map((item) => ({ rotulo: item.nome, valor: item.total })));
}

export function montarAlunosPorProfessor(lista: DashboardAdmin['alunos_por_professor']): DadoBarra[] {
  return maioresPrimeiro(
    (lista ?? []).map((item) => ({
      rotulo: item.professor_id === null || !item.nome ? ROTULO_SEM_PROFESSOR : item.nome,
      valor: item.total,
    }))
  );
}

export function montarAtivosInativos(valores: DashboardAdmin['series']['ativos_inativos']): DadoBarra[] {
  return [
    { rotulo: 'Ativos', valor: valores?.ativos ?? 0 },
    { rotulo: 'Inativos', valor: valores?.inativos ?? 0 },
  ];
}

/** Valor decimal da API ("1234.50") como número, só para desenhar o gráfico (a exibição usa `formatarMoeda`). */
export function dinheiroParaNumero(valor: string | null | undefined): number {
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : 0;
}

export function montarRecebidoPorMes(lista: Financeiro['recebido_por_mes']): DadoBarra[] {
  return mesesOrdenados(lista ?? []).map((item) => ({
    rotulo: rotuloMes(item.mes),
    valor: dinheiroParaNumero(item.total),
  }));
}

export function montarRecebidoPorForma(lista: Financeiro['recebido_por_forma']): DadoBarra[] {
  return maioresPrimeiro(
    (lista ?? []).map((item) => ({
      rotulo: formaPagamento(item.forma).rotulo,
      valor: dinheiroParaNumero(item.total),
    }))
  );
}

function doisDigitos(numero: number): string {
  return String(numero).padStart(2, '0');
}

function isoLocal(ano: number, mes: number, dia: number): string {
  return `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
}

/** Primeiro e último dia do mês de `referencia` (padrão: hoje), em ISO local. */
export function periodoDoMes(referencia: Date = new Date()): Required<FiltrosFinanceiro> {
  const ano = referencia.getFullYear();
  const mes = referencia.getMonth() + 1;
  const ultimo = new Date(ano, mes, 0).getDate();

  return { inicio: isoLocal(ano, mes, 1), fim: isoLocal(ano, mes, ultimo) };
}

/** Desloca o período de mês inteiro `delta` meses (negativo = passado). */
export function deslocarMes(periodo: Required<FiltrosFinanceiro>, delta: number): Required<FiltrosFinanceiro> {
  const [ano, mes] = periodo.inicio.split('-').map(Number);

  return periodoDoMes(new Date(ano, mes - 1 + delta, 1));
}

/** "nov/26" para um período de mês inteiro; senão "01/11 a 15/11". */
export function rotuloPeriodo(periodo: FiltrosFinanceiro): string {
  const { inicio, fim } = periodo;

  if (!inicio || !fim) return 'Mês atual';

  const mesCheio = periodoDoMes(new Date(Number(inicio.slice(0, 4)), Number(inicio.slice(5, 7)) - 1, 1));

  if (mesCheio.inicio === inicio && mesCheio.fim === fim) return rotuloMes(inicio.slice(0, 7));

  const curta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

  return `${curta(inicio)} a ${curta(fim)}`;
}

export interface SemanaEntradas {
  /** Segunda-feira da semana (ISO). A API envia `semana_inicio`; versões antigas, `semana`. */
  semana_inicio?: string;
  semana?: string;
  total: number;
}

/** Soma as entradas semanais por mês (pela segunda-feira da semana), em ordem cronológica. */
export function entradasPorMes(semanas: SemanaEntradas[] | null | undefined): DadoBarra[] {
  const porMes = new Map<string, number>();

  for (const item of semanas ?? []) {
    const data = item.semana_inicio ?? item.semana ?? '';
    const mes = data.slice(0, 7);

    if (MES_VALIDO.test(mes)) porMes.set(mes, (porMes.get(mes) ?? 0) + item.total);
  }

  return [...porMes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, total]) => ({ rotulo: rotuloMes(mes), valor: total }));
}

/** Valor curto para rótulos apertados: 0 -> "0", 850 -> "R$ 850", 1250 -> "R$ 1,3 mil", 2500000 -> "R$ 2,5 mi". */
export function formatarMoedaCompacta(valor: number): string {
  if (!Number.isFinite(valor) || valor === 0) return '0';

  const absoluto = Math.abs(valor);
  const sinal = valor < 0 ? '-' : '';
  const decimal = (n: number) => n.toFixed(1).replace('.', ',').replace(/,0$/, '');

  if (absoluto >= 1_000_000) return `${sinal}R$ ${decimal(absoluto / 1_000_000)} mi`;
  if (absoluto >= 1_000) return `${sinal}R$ ${decimal(absoluto / 1_000)} mil`;

  return `${sinal}R$ ${Math.round(absoluto)}`;
}
