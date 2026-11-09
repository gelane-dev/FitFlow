import {
  folgaFinal,
  deslocamentoInicial,
  posicaoRotuloX,
  AreaGrafico,
  calcularEscalaY,
  caminhoDaLinha,
  larguraDoGrafico,
  posicaoY,
  posicionarPontos,
  rotulosDoEixoX,
} from '@/utils/graficoLinha';

const area: AreaGrafico = { largura: 300, altura: 200, topo: 10, base: 10, esquerda: 20, direita: 20 };

describe('calcularEscalaY', () => {
  it('lista vazia não tem escala', () => {
    expect(calcularEscalaY([])).toBeNull();
  });

  it('cobre todos os valores e termina em marcas redondas, sem forçar o zero', () => {
    const escala = calcularEscalaY([72, 75, 78])!;

    expect(escala.minimo).toBeGreaterThan(0);
    expect(escala.minimo).toBeLessThanOrEqual(72);
    expect(escala.maximo).toBeGreaterThanOrEqual(78);
    expect(escala.marcas[0]).toBe(escala.minimo);
    expect(escala.marcas[escala.marcas.length - 1]).toBe(escala.maximo);
  });

  it('valores iguais ganham margem para o ponto ficar no meio', () => {
    const escala = calcularEscalaY([50, 50, 50])!;

    expect(escala.minimo).toBeLessThan(50);
    expect(escala.maximo).toBeGreaterThan(50);
    expect(posicaoY(50, escala, area)).toBeGreaterThan(area.topo);
    expect(posicaoY(50, escala, area)).toBeLessThan(area.altura - area.base);
  });

  it('um ponto só também ganha margem', () => {
    const escala = calcularEscalaY([0.5])!;

    expect(escala.maximo).toBeGreaterThan(escala.minimo);
  });

  it('valor zero repetido não quebra a escala', () => {
    const escala = calcularEscalaY([0, 0])!;

    expect(escala.maximo).toBeGreaterThan(escala.minimo);
    expect(escala.minimo).toBeGreaterThanOrEqual(0);
  });

  it('valores nunca negativos não ganham eixo abaixo de zero', () => {
    expect(calcularEscalaY([1, 100])!.minimo).toBeGreaterThanOrEqual(0);
  });

  it('valores negativos podem ir abaixo de zero', () => {
    expect(calcularEscalaY([-5, 5])!.minimo).toBeLessThan(0);
  });

  it('marcas em ordem crescente e sem ruído de ponto flutuante', () => {
    const { marcas } = calcularEscalaY([0.1, 0.4])!;

    expect([...marcas].sort((a, b) => a - b)).toEqual(marcas);
    marcas.forEach((m) => expect(Number(m.toFixed(6))).toBe(m));
  });

  it('ignora valores não finitos', () => {
    expect(calcularEscalaY([Number.NaN])).toBeNull();
    expect(calcularEscalaY([10, Number.NaN, 20])).not.toBeNull();
  });
});

describe('posicaoY / posicionarPontos', () => {
  const escala = { minimo: 0, maximo: 100, marcas: [0, 50, 100] };

  it('o máximo fica no topo da área útil e o mínimo na base', () => {
    expect(posicaoY(100, escala, area)).toBe(10);
    expect(posicaoY(0, escala, area)).toBe(190);
    expect(posicaoY(50, escala, area)).toBe(100);
  });

  it('lista vazia não gera pontos', () => {
    expect(posicionarPontos([], escala, area)).toEqual([]);
  });

  it('um ponto só fica no centro horizontal', () => {
    const [ponto] = posicionarPontos([{ data: '2026-11-01', valor: 50 }], escala, area);

    expect(ponto.x).toBe(150);
    expect(ponto.y).toBe(100);
  });

  it('vários pontos se espalham de ponta a ponta da área útil, na ordem recebida', () => {
    const pontos = posicionarPontos(
      [
        { data: 'a', valor: 0 },
        { data: 'b', valor: 50 },
        { data: 'c', valor: 100 },
      ],
      escala,
      area
    );

    expect(pontos.map((p) => p.x)).toEqual([20, 150, 280]);
    expect(pontos.map((p) => p.data)).toEqual(['a', 'b', 'c']);
  });
});

describe('caminhoDaLinha', () => {
  it('menos de dois pontos não desenha linha', () => {
    expect(caminhoDaLinha([])).toBe('');
    expect(caminhoDaLinha([{ data: 'a', valor: 1, x: 10, y: 20 }])).toBe('');
  });

  it('junta as coordenadas para a polyline', () => {
    expect(
      caminhoDaLinha([
        { data: 'a', valor: 1, x: 10, y: 20 },
        { data: 'b', valor: 2, x: 30.5, y: 40 },
      ])
    ).toBe('10,20 30.5,40');
  });
});

describe('larguraDoGrafico', () => {
  it('ocupa a largura disponível quando os pontos cabem', () => {
    expect(larguraDoGrafico(320, 3)).toBe(320);
  });

  it('cresce para manter 44 pt por ponto quando há muitos (o gráfico rola)', () => {
    expect(larguraDoGrafico(320, 30)).toBe(1320);
  });

  it('largura ainda não medida usa o mínimo dos pontos', () => {
    expect(larguraDoGrafico(0, 0)).toBe(0);
    expect(larguraDoGrafico(0, 2)).toBe(88);
  });
});

describe('rotulosDoEixoX', () => {
  it('um rótulo dd/mm por ponto', () => {
    expect(rotulosDoEixoX([{ data: '2026-10-30', valor: 1 }, { data: '2026-11-01', valor: 2 }])).toEqual(['30/10', '01/11']);
  });

  it('pontos seguidos no mesmo dia não repetem o rótulo', () => {
    const pontos = [
      { data: '2026-10-31', valor: 70.5 },
      { data: '2026-10-31', valor: 71 },
      { data: '2026-10-31T09:00:00', valor: 71.2 },
      { data: '2026-11-02', valor: 72 },
    ];

    expect(rotulosDoEixoX(pontos)).toEqual(['31/10', null, null, '02/11']);
  });

  it('lista vazia', () => {
    expect(rotulosDoEixoX([])).toEqual([]);
  });
});

describe('posicaoRotuloX', () => {
  it('centraliza o rótulo no ponto quando cabe', () => {
    expect(posicaoRotuloX(100, 44, 300)).toBe(78);
  });

  it('nunca deixa o primeiro nem o último rótulo fora da área', () => {
    expect(posicaoRotuloX(10, 44, 300)).toBe(0);
    expect(posicaoRotuloX(295, 44, 300)).toBe(256);
  });

  it('área menor que o rótulo fica em 0', () => {
    expect(posicaoRotuloX(10, 44, 30)).toBe(0);
  });
});

describe('deslocamentoInicial', () => {
  it('sem excesso de largura não rola', () => {
    expect(deslocamentoInicial(300, 6, 44)).toBe(0);
    expect(deslocamentoInicial(0, 6, 44)).toBe(0);
  });

  it('alinha a fronteira de ponto: primeiro rótulo visível inteiro (320 px, 6 pontos)', () => {
    // 216 px visíveis = 4 pontos inteiros; começa no 3º ponto (índice 2), nunca em meio ponto.
    const x = deslocamentoInicial(216, 6, 44);

    expect(x).toBe(88);
    expect(x % 44).toBe(0);
  });

  it('com muitos pontos mostra os últimos', () => {
    expect(deslocamentoInicial(216, 30, 44)).toBe((30 - 4) * 44);
  });
});

describe('folgaFinal', () => {
  it('deslocamento alinhado a ponto cabe na rolagem (conteúdo + folga − largura ≥ deslocamento)', () => {
    for (const [disp, n] of [[206, 5], [216, 6], [310, 9], [352, 12]]) {
      const total = n * 44;

      expect(total + folgaFinal(disp, n, 44) - disp).toBeGreaterThanOrEqual(deslocamentoInicial(disp, n, 44));
    }
  });

  it('sem rolagem não há folga', () => {
    expect(folgaFinal(300, 6, 44)).toBe(0);
    expect(folgaFinal(0, 6, 44)).toBe(0);
  });
});
