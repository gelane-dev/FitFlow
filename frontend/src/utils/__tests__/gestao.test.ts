import { AxiosError, isAxiosError } from 'axios';

import { decimalParaCampo, mascararMoeda, moedaParaDecimal } from '@/utils/campoMoeda';
import { mensagemErroLogin } from '@/utils/erroApi';
import {
  abreviarRotulo,
  calcularEscalaBarras,
  mostrarRotuloNoIndice,
  passoRotulosEixo,
  posicionarBarras,
  resumirBarras,
} from '@/utils/graficoBarras';
import { classificarLargura, colunasPorLargura } from '@/utils/larguraTela';
import { calcularPaginacao } from '@/utils/paginacao';

describe('classificarLargura / colunasPorLargura', () => {
  it('celular < 768, médio >= 768, largo >= 1024', () => {
    expect(classificarLargura(390)).toEqual({ largura: 390, ehMedio: false, ehLargo: false });
    expect(classificarLargura(768)).toEqual({ largura: 768, ehMedio: true, ehLargo: false });
    expect(classificarLargura(1023)).toMatchObject({ ehMedio: true, ehLargo: false });
    expect(classificarLargura(1024)).toMatchObject({ ehMedio: true, ehLargo: true });
  });

  it('a grade vai de 1 a 4 colunas', () => {
    expect(colunasPorLargura(360)).toBe(1);
    expect(colunasPorLargura(480)).toBe(2);
    expect(colunasPorLargura(720)).toBe(3);
    expect(colunasPorLargura(960)).toBe(4);
  });
});

describe('calcularPaginacao', () => {
  it('calcula intervalo, total de páginas e vizinhas', () => {
    expect(calcularPaginacao(135, 20, 2)).toEqual({
      pagina: 2,
      totalPaginas: 7,
      inicio: 21,
      fim: 40,
      temAnterior: true,
      temProxima: true,
    });
  });

  it('última página termina no total e não tem próxima', () => {
    expect(calcularPaginacao(135, 20, 7)).toMatchObject({ inicio: 121, fim: 135, temProxima: false });
  });

  it('limita página fora do intervalo e trata lista vazia', () => {
    expect(calcularPaginacao(10, 20, 9).pagina).toBe(1);
    expect(calcularPaginacao(0, 20, 1)).toMatchObject({ inicio: 0, fim: 0, totalPaginas: 1, temProxima: false });
  });
});

describe('campoMoeda', () => {
  it('mascara os dígitos como centavos', () => {
    expect(mascararMoeda('')).toBe('');
    expect(mascararMoeda('5')).toBe('0,05');
    expect(mascararMoeda('9990')).toBe('99,90');
    expect(mascararMoeda('R$ 123456')).toBe('1.234,56');
  });

  it('converte para decimal da API e de volta para o campo', () => {
    expect(moedaParaDecimal('1.234,56')).toBe('1234.56');
    expect(moedaParaDecimal('')).toBeNull();
    expect(decimalParaCampo('99.90')).toBe('99,90');
    expect(decimalParaCampo(null)).toBe('');
  });

  it('decimalParaCampo trabalha sobre o texto: sem float, mesmo com valores grandes (GB-05)', () => {
    // 9007199254740993 passa de Number.MAX_SAFE_INTEGER: a conta em float perderia o último dígito
    expect(decimalParaCampo('9007199254740993.10')).toBe('9.007.199.254.740.993,10');
    expect(decimalParaCampo('0.29')).toBe('0,29');
    expect(decimalParaCampo('1234.5')).toBe('1.234,50');
    expect(decimalParaCampo(1234.5)).toBe('1.234,50');
    expect(decimalParaCampo('abc')).toBe('');
    expect(decimalParaCampo(Number.NaN)).toBe('');
  });

  it('ida e volta entre campo e decimal da API é idêntica', () => {
    for (const decimal of ['0.05', '99.90', '1234.56', '1000000.00']) {
      expect(moedaParaDecimal(decimalParaCampo(decimal))).toBe(decimal);
    }
  });
});

describe('graficoBarras', () => {
  it('escala "bonita" a partir de zero que cobre o maior valor', () => {
    const escala = calcularEscalaBarras([120, 900, 450]);

    expect(escala.marcas[0]).toBe(0);
    expect(escala.maximo).toBeGreaterThanOrEqual(900);
    expect(escala.marcas[escala.marcas.length - 1]).toBe(escala.maximo);
  });

  it('sem valores positivos usa a escala 0–1', () => {
    expect(calcularEscalaBarras([])).toEqual({ maximo: 1, marcas: [0, 1] });
    expect(calcularEscalaBarras([0, -5])).toEqual({ maximo: 1, marcas: [0, 1] });
  });

  it('altura da barra é proporcional ao valor e negativos viram zero', () => {
    const area = { largura: 300, altura: 200, topo: 20, base: 20, esquerda: 0, direita: 0 };
    const escala = { maximo: 100, marcas: [0, 100] };
    const [metade, cheia, negativa] = posicionarBarras(
      [
        { rotulo: 'A', valor: 50 },
        { rotulo: 'B', valor: 100 },
        { rotulo: 'C', valor: -3 },
      ],
      escala,
      area,
      'vertical',
    );

    expect(cheia.altura).toBe(160);
    expect(metade.altura).toBe(80);
    expect(negativa.altura).toBe(0);
    expect(cheia.y).toBe(20);
  });

  it('no horizontal a largura da barra é proporcional', () => {
    const [barra] = posicionarBarras(
      [{ rotulo: 'A', valor: 25 }],
      { maximo: 100, marcas: [0, 100] },
      { largura: 400, altura: 60, topo: 0, base: 0, esquerda: 100, direita: 100 },
      'horizontal',
    );

    expect(barra.largura).toBe(50);
  });

  it('abrevia rótulos longos e resume para leitores de tela', () => {
    expect(abreviarRotulo('Janeiro de 2026', 8)).toBe('Janeiro…');
    expect(abreviarRotulo('Jan', 8)).toBe('Jan');
    expect(resumirBarras('Receita', [{ rotulo: 'Jan', valor: 10 }], String)).toBe('Receita: Jan 10');
    expect(resumirBarras('Receita', [], String)).toBe('Receita: sem dados');
  });
});

describe('mensagemErroLogin', () => {
  function erro403(detail?: unknown) {
    const resposta = {
      status: 403,
      data: detail === undefined ? {} : { detail },
      statusText: '',
      headers: {},
      config: {},
    };

    return new AxiosError('x', 'ERR_BAD_REQUEST', undefined, null, resposta as never);
  }

  it.each([
    'Cadastro aguardando aprovação da recepção',
    'Cadastro não aprovado. Procure a recepção',
    'Conta desativada',
  ])('mostra o detail do 403: %s', (detail) => {
    const e = erro403(detail);

    expect(isAxiosError(e)).toBe(true);
    expect(mensagemErroLogin(e)).toBe(detail);
  });

  it('403 sem detail vira orientação, não erro inesperado', () => {
    expect(mensagemErroLogin(erro403())).toBe('Acesso não liberado. Procure a recepção.');
  });

  it('outros erros mantêm as mensagens de sempre', () => {
    expect(mensagemErroLogin(new Error('x'))).toBe('Ocorreu um erro inesperado.');
  });
});

describe('passoRotulosEixo (rótulos do eixo X sem sobreposição)', () => {
  it('poucas barras em tela larga mostram todos os rótulos', () => {
    expect(passoRotulosEixo(80, 8)).toBe(1);
  });

  it('muitas barras em tela estreita mostram um rótulo a cada N barras', () => {
    // 13 semanas em ~300 px: faixa de 23 px, rótulo "dd/mm" (5 car.) pede ~40 px → a cada 2
    expect(passoRotulosEixo(23, 5)).toBe(2);
    expect(passoRotulosEixo(10, 5)).toBe(4);
  });

  it('o passo cresce com o tamanho do rótulo e nunca é menor que 1', () => {
    expect(passoRotulosEixo(30, 8)).toBeGreaterThan(passoRotulosEixo(30, 3));
    expect(passoRotulosEixo(500, 3)).toBe(1);
    expect(passoRotulosEixo(0, 5)).toBe(1);
  });

  it('mostrarRotuloNoIndice mantém o primeiro e espaça os demais', () => {
    const indices = [0, 1, 2, 3, 4, 5, 6].filter((i) => mostrarRotuloNoIndice(i, 3));
    expect(indices).toEqual([0, 3, 6]);
    expect(mostrarRotuloNoIndice(4, 1)).toBe(true);
  });
});
