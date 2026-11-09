/** Matemática do gráfico de linha (escala, eixo Y e coordenadas). Funções puras, sem React. */

import { formatarDataCurta } from './evolucao';

export interface PontoGrafico {
  /** Data ISO ("2026-11-01") ou datetime; só é repassada, não entra na conta. */
  data: string;
  valor: number;
}

export interface EscalaY {
  minimo: number;
  maximo: number;
  /** Valores das marcas do eixo, do menor para o maior (inclui `minimo` e `maximo`). */
  marcas: number[];
}

export interface AreaGrafico {
  largura: number;
  altura: number;
  topo: number;
  base: number;
  esquerda: number;
  direita: number;
}

export interface PontoPosicionado extends PontoGrafico {
  x: number;
  y: number;
}

/** Arredonda ruídos de ponto flutuante (0.30000000000000004 → 0.3). */
function limpar(valor: number): number {
  return Number(valor.toFixed(10));
}

/** Passo "bonito" (1, 2, 2.5, 5 × 10ⁿ) que cobre `bruto`. */
function passoAgradavel(bruto: number): number {
  const expoente = Math.floor(Math.log10(bruto));
  const base = 10 ** expoente;
  const fracao = bruto / base;
  const multiplo = fracao <= 1 ? 1 : fracao <= 2 ? 2 : fracao <= 2.5 ? 2.5 : fracao <= 5 ? 5 : 10;

  return limpar(multiplo * base);
}

/**
 * Eixo Y derivado dos dados: não força o zero, ganha margem quando todos os valores são iguais
 * e termina em números redondos. `null` para lista vazia (ou sem valor finito).
 */
export function calcularEscalaY(valores: number[], quantidadeMarcas = 4): EscalaY | null {
  const finitos = valores.filter((v) => Number.isFinite(v));

  if (finitos.length === 0) {
    return null;
  }

  const menor = Math.min(...finitos);
  const maior = Math.max(...finitos);
  const marcasPedidas = Math.max(2, Math.floor(quantidadeMarcas));

  // Todos iguais: margem de 10% (no mínimo 1) para o ponto não colar na borda nem sumir.
  const margem = menor === maior ? Math.max(Math.abs(menor) * 0.1, 1) : (maior - menor) * 0.1;
  let inferior = menor - margem;
  const superior = maior + margem;

  // Valores que nunca foram negativos (cargas, repetições) não ganham eixo abaixo de zero.
  if (menor >= 0 && inferior < 0) {
    inferior = 0;
  }

  const passo = passoAgradavel((superior - inferior) / (marcasPedidas - 1));
  const minimo = limpar(Math.floor(inferior / passo) * passo);
  const maximo = limpar(Math.ceil(superior / passo) * passo);
  const marcas: number[] = [];

  for (let valor = minimo; valor <= maximo + passo / 2; valor += passo) {
    marcas.push(limpar(valor));
  }

  return { minimo, maximo, marcas };
}

/** Posição vertical (px) de um valor: `maximo` no topo da área útil, `minimo` na base. */
export function posicaoY(valor: number, escala: EscalaY, area: AreaGrafico): number {
  const util = area.altura - area.topo - area.base;
  const amplitude = escala.maximo - escala.minimo;

  if (amplitude <= 0) {
    return area.topo + util / 2;
  }

  return area.topo + (1 - (valor - escala.minimo) / amplitude) * util;
}

/**
 * Posiciona os pontos em ordem, com espaçamento igual no eixo X (um ponto só = centro da área).
 * Lista vazia devolve lista vazia.
 */
export function posicionarPontos(
  pontos: PontoGrafico[],
  escala: EscalaY,
  area: AreaGrafico
): PontoPosicionado[] {
  const util = area.largura - area.esquerda - area.direita;

  return pontos.map((ponto, i) => ({
    ...ponto,
    x: pontos.length === 1 ? area.esquerda + util / 2 : area.esquerda + (util * i) / (pontos.length - 1),
    y: posicaoY(ponto.valor, escala, area),
  }));
}

/** Atributo `points` de uma polyline SVG; vazio com menos de 2 pontos (um ponto só não tem linha). */
export function caminhoDaLinha(posicionados: PontoPosicionado[]): string {
  if (posicionados.length < 2) {
    return '';
  }

  return posicionados.map((p) => `${limpar(p.x)},${limpar(p.y)}`).join(' ');
}

/**
 * Largura total da área de plotagem: ocupa a largura disponível, mas cada ponto ganha pelo menos
 * `larguraMinimaPonto` (alvo de toque de 44 pt); com muitos pontos o gráfico rola na horizontal.
 */
export function larguraDoGrafico(
  larguraDisponivel: number,
  quantidade: number,
  larguraMinimaPonto = 44
): number {
  return Math.max(larguraDisponivel, quantidade * larguraMinimaPonto);
}

/**
 * Rótulos do eixo X (um por ponto, "dd/mm"). Dois pontos seguidos no mesmo dia não repetem o
 * rótulo: o segundo vem `null` (o ponto continua no gráfico e o toque mostra a data).
 */
export function rotulosDoEixoX(pontos: PontoGrafico[]): (string | null)[] {
  return pontos.map((ponto, i) =>
    i > 0 && pontos[i - 1].data.slice(0, 10) === ponto.data.slice(0, 10) ? null : formatarDataCurta(ponto.data)
  );
}

/**
 * Deslocamento inicial da rolagem: mostra o ponto mais recente, mas alinhado a uma fronteira de
 * ponto, para o primeiro e o último rótulo do eixo X ficarem inteiros (sem cortar o primeiro
 * rótulo visível). Sem excesso de largura não há rolagem (0).
 */
export function deslocamentoInicial(
  larguraDisponivel: number,
  quantidade: number,
  larguraMinimaPonto = 44
): number {
  const total = quantidade * larguraMinimaPonto;

  if (larguraDisponivel <= 0 || total <= larguraDisponivel) {
    return 0;
  }

  const inteiros = Math.max(1, Math.floor(larguraDisponivel / larguraMinimaPonto));

  return Math.max(0, (quantidade - inteiros) * larguraMinimaPonto);
}

/** Posição `left` do rótulo do eixo X: centrado no ponto, mas nunca fora da área do gráfico. */
export function posicaoRotuloX(x: number, larguraRotulo: number, larguraGrafico: number): number {
  return Math.min(Math.max(x - larguraRotulo / 2, 0), Math.max(larguraGrafico - larguraRotulo, 0));
}

/**
 * Folga em branco à direita do gráfico quando ele rola: sem ela o navegador limita a rolagem ao
 * fim do conteúdo e o `deslocamentoInicial` (alinhado a ponto) não seria alcançável, cortando o
 * primeiro rótulo visível. Sem rolagem, 0.
 */
export function folgaFinal(larguraDisponivel: number, quantidade: number, larguraMinimaPonto = 44): number {
  if (larguraDisponivel <= 0 || quantidade * larguraMinimaPonto <= larguraDisponivel) {
    return 0;
  }

  return larguraDisponivel % larguraMinimaPonto;
}
