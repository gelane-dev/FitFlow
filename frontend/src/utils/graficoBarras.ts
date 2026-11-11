/** Matemática do gráfico de barras (escala e geometria). Funções puras, sem React. */

export type OrientacaoBarras = 'vertical' | 'horizontal';

export interface DadoBarra {
  rotulo: string;
  valor: number;
}

export interface EscalaBarras {
  /** Sempre >= 1 e "bonito" (1, 2, 2.5, 5 × 10ⁿ); o zero é a base. */
  maximo: number;
  /** Valores das marcas, de 0 até `maximo`. */
  marcas: number[];
}

export interface BarraPosicionada extends DadoBarra {
  x: number;
  y: number;
  largura: number;
  altura: number;
  /** Posição do rótulo e do valor (centro da barra no vertical; início da área no horizontal). */
  rotuloX: number;
  rotuloY: number;
  valorX: number;
  valorY: number;
}

const PASSOS = [1, 2, 2.5, 5, 10];

/** Maior valor "bonito" que cobre `maximo`. Sem dados positivos, escala 0–1. */
export function calcularEscalaBarras(valores: number[], divisoes = 4): EscalaBarras {
  const maiorBruto = Math.max(0, ...valores.filter(Number.isFinite));

  if (maiorBruto <= 0) {
    return { maximo: 1, marcas: [0, 1] };
  }

  const passoBruto = maiorBruto / divisoes;
  const base = 10 ** Math.floor(Math.log10(passoBruto));
  const passo = (PASSOS.find((p) => p * base >= passoBruto) ?? 10) * base;
  const quantidade = Math.ceil(maiorBruto / passo - 1e-9);
  const marcas = Array.from({ length: quantidade + 1 }, (_, i) => Number((i * passo).toFixed(10)));

  return { maximo: marcas[marcas.length - 1], marcas };
}

export interface AreaBarras {
  largura: number;
  altura: number;
  /** Espaço reservado para rótulos/valores. */
  topo: number;
  base: number;
  esquerda: number;
  direita: number;
}

/** Corta o rótulo para caber no espaço, com reticências. */
export function abreviarRotulo(rotulo: string, maximo: number): string {
  return rotulo.length > maximo ? `${rotulo.slice(0, Math.max(1, maximo - 1))}…` : rotulo;
}

/** Valores negativos ou inválidos viram barra de altura zero (o gráfico é de grandezas positivas). */
export function posicionarBarras(
  dados: DadoBarra[],
  escala: EscalaBarras,
  area: AreaBarras,
  orientacao: OrientacaoBarras,
): BarraPosicionada[] {
  const util = {
    largura: Math.max(0, area.largura - area.esquerda - area.direita),
    altura: Math.max(0, area.altura - area.topo - area.base),
  };
  const n = dados.length;

  if (n === 0) {
    return [];
  }

  const proporcao = (valor: number) =>
    Number.isFinite(valor) && valor > 0 ? Math.min(1, valor / escala.maximo) : 0;

  if (orientacao === 'vertical') {
    const faixa = util.largura / n;
    const largura = Math.min(48, faixa * 0.6);

    return dados.map((dado, i) => {
      const altura = util.altura * proporcao(dado.valor);
      const centro = area.esquerda + faixa * i + faixa / 2;
      const y = area.topo + util.altura - altura;

      return {
        ...dado,
        x: centro - largura / 2,
        y,
        largura,
        altura,
        rotuloX: centro,
        rotuloY: area.altura - area.base + 16,
        valorX: centro,
        valorY: y - 6,
      };
    });
  }

  const faixa = util.altura / n;
  const espessura = Math.min(28, faixa * 0.6);

  return dados.map((dado, i) => {
    const largura = util.largura * proporcao(dado.valor);
    const centro = area.topo + faixa * i + faixa / 2;

    return {
      ...dado,
      x: area.esquerda,
      y: centro - espessura / 2,
      largura,
      altura: espessura,
      rotuloX: area.esquerda - 8,
      rotuloY: centro + 4,
      valorX: area.esquerda + largura + 6,
      valorY: centro + 4,
    };
  });
}

/** Resumo para leitores de tela: "Receita: Jan 1.200, Fev 900". */
export function resumirBarras(rotulo: string, dados: DadoBarra[], formatar: (valor: number) => string): string {
  if (dados.length === 0) {
    return `${rotulo}: sem dados`;
  }

  return `${rotulo}: ${dados.map((d) => `${d.rotulo} ${formatar(d.valor)}`).join(', ')}`;
}

/** Largura média de um caractere de rótulo (fonte 11 px), em px. */
const LARGURA_CARACTERE_ROTULO = 6.4;
const FOLGA_ENTRE_ROTULOS = 8;

/**
 * Passo do eixo X vertical: mostra um rótulo a cada N barras para que rótulos vizinhos não se
 * sobreponham. `faixa` é a largura de cada barra; `maiorRotulo` o nº de caracteres do maior rótulo.
 * Todas as barras continuam desenhadas e acessíveis; só o texto do eixo é espaçado.
 */
export function passoRotulosEixo(faixa: number, maiorRotulo: number): number {
  if (!(faixa > 0) || maiorRotulo <= 0) {
    return 1;
  }

  const necessario = maiorRotulo * LARGURA_CARACTERE_ROTULO + FOLGA_ENTRE_ROTULOS;

  return Math.max(1, Math.ceil(necessario / faixa));
}

/** O rótulo do índice aparece? Com passo N, o primeiro e a cada N barras. */
export function mostrarRotuloNoIndice(indice: number, passo: number): boolean {
  return indice % Math.max(1, passo) === 0;
}
