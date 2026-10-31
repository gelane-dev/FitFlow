import { Execucao } from '@/types/sessao.types';
import {
  agruparPorExercicio,
  ajustarCampo,
  aplicarExecucoes,
  lerNumero,
  minutosDesde,
  montarSeries,
  reconciliarSeries,
  SerieExecucao,
  volumeDasSeries,
} from '@/utils/sessao';

function execucao(parcial: Partial<Execucao>): Execucao {
  return {
    id: 1,
    sessao_id: 1,
    item_ficha_id: 1,
    exercicio_id: 1,
    exercicio_nome: 'Supino',
    data_execucao: '2026-10-30T08:00:00',
    series_realizadas: 1,
    repeticoes_realizadas: 10,
    carga_utilizada: 20,
    observacao: null,
    ...parcial,
  };
}

const itens = [
  { id: 1, series: 3, repeticoes: 12, carga: 20 },
  { id: 2, series: 2, repeticoes: 8, carga: 0 },
];

describe('agruparPorExercicio', () => {
  it('agrupa mantendo a ordem da primeira aparição', () => {
    const grupos = agruparPorExercicio([
      execucao({ id: 1, exercicio_id: 7, exercicio_nome: 'Remada' }),
      execucao({ id: 2, exercicio_id: 3, exercicio_nome: 'Supino' }),
      execucao({ id: 3, exercicio_id: 7, exercicio_nome: 'Remada' }),
    ]);

    expect(grupos.map((g) => g.exercicioId)).toEqual([7, 3]);
    expect(grupos[0].execucoes.map((e) => e.id)).toEqual([1, 3]);
    expect(grupos[0].exercicioNome).toBe('Remada');
  });

  it('lista vazia gera nenhum grupo', () => {
    expect(agruparPorExercicio([])).toEqual([]);
  });
});

describe('montarSeries', () => {
  it('cria uma série por repetição de `series` com valores prescritos', () => {
    const series = montarSeries(itens);

    expect(Object.keys(series)).toEqual(['1-0', '1-1', '1-2', '2-0', '2-1']);
    expect(series['1-2']).toEqual({
      chave: '1-2',
      itemId: 1,
      indice: 2,
      repeticoes: '12',
      carga: '20',
      feita: false,
    });
    expect(series['2-0'].carga).toBe('0');
  });
});

describe('aplicarExecucoes (retomada)', () => {
  it('marca as primeiras séries do item com os valores gravados', () => {
    const series = aplicarExecucoes(montarSeries(itens), [
      execucao({ item_ficha_id: 1, repeticoes_realizadas: 10, carga_utilizada: 25 }),
      execucao({ id: 2, item_ficha_id: 1, repeticoes_realizadas: 9, carga_utilizada: 25 }),
    ]);

    expect(series['1-0']).toMatchObject({ feita: true, repeticoes: '10', carga: '25' });
    expect(series['1-1']).toMatchObject({ feita: true, repeticoes: '9' });
    expect(series['1-2'].feita).toBe(false);
    expect(series['2-0'].feita).toBe(false);
  });

  it('um registro com várias séries realizadas marca várias', () => {
    const series = aplicarExecucoes(montarSeries(itens), [
      execucao({ item_ficha_id: 2, series_realizadas: 2 }),
    ]);

    expect(series['2-0'].feita).toBe(true);
    expect(series['2-1'].feita).toBe(true);
  });

  it('não ultrapassa o número de séries prescritas e não muta a entrada', () => {
    const base = montarSeries(itens);
    const series = aplicarExecucoes(base, [
      execucao({ item_ficha_id: 2, series_realizadas: 5 }),
      execucao({ id: 2, item_ficha_id: 99 }),
    ]);

    expect(Object.keys(series)).toHaveLength(5);
    expect(base['2-0'].feita).toBe(false);
  });
});

describe('reconciliarSeries', () => {
  it('marca como feitas as séries que o servidor já gravou', () => {
    const resultado = reconciliarSeries(montarSeries(itens), [
      execucao({ item_ficha_id: 1 }),
      execucao({ id: 2, item_ficha_id: 1 }),
    ]);

    expect(resultado['1-0'].feita).toBe(true);
    expect(resultado['1-1'].feita).toBe(true);
    expect(resultado['1-2'].feita).toBe(false);
  });

  it('desconta as séries já marcadas localmente (déficit)', () => {
    const base = montarSeries(itens);
    base['1-0'] = { ...base['1-0'], feita: true };

    const resultado = reconciliarSeries(base, [
      execucao({ item_ficha_id: 1 }),
      execucao({ id: 2, item_ficha_id: 1 }),
    ]);

    // 2 gravadas, 1 já feita: só mais uma é marcada.
    expect(resultado['1-1'].feita).toBe(true);
    expect(resultado['1-2'].feita).toBe(false);
  });

  it('a chave preferida (em envio) é marcada primeiro', () => {
    const resultado = reconciliarSeries(
      montarSeries(itens),
      [execucao({ item_ficha_id: 1 })],
      '1-2'
    );

    expect(resultado['1-2'].feita).toBe(true);
    expect(resultado['1-0'].feita).toBe(false);
  });

  it('sem registros no servidor nada muda, e a entrada não é mutada', () => {
    const base = montarSeries(itens);

    expect(reconciliarSeries(base, [], '1-0')).toEqual(base);
    expect(
      reconciliarSeries(base, [execucao({ item_ficha_id: 1 })])['1-0'].feita
    ).toBe(true);
    expect(base['1-0'].feita).toBe(false);
  });

  it('é idempotente: reconciliar duas vezes dá o mesmo resultado', () => {
    const execs = [execucao({ item_ficha_id: 1 })];
    const uma = reconciliarSeries(montarSeries(itens), execs);

    expect(reconciliarSeries(uma, execs)).toEqual(uma);
  });
});

describe('lerNumero (sessão)', () => {
  it('aceita vírgula decimal e zero', () => {
    expect(lerNumero('12,5')).toBe(12.5);
    expect(lerNumero(' 0 ')).toBe(0);
  });

  it('rejeita vazio, texto e negativo com null', () => {
    expect(lerNumero('')).toBeNull();
    expect(lerNumero('   ')).toBeNull();
    expect(lerNumero('abc')).toBeNull();
    expect(lerNumero('-1')).toBeNull();
  });
});

describe('volumeDasSeries / ajustarCampo', () => {
  const serie = (parcial: Partial<SerieExecucao>): SerieExecucao => ({
    chave: '1-0',
    itemId: 1,
    indice: 0,
    repeticoes: '10',
    carga: '20',
    feita: true,
    ...parcial,
  });

  it('soma só as séries feitas', () => {
    const series = {
      a: serie({}),
      b: serie({ chave: '1-1', indice: 1, repeticoes: '8', carga: '22,5' }),
      c: serie({ chave: '1-2', indice: 2, feita: false }),
    };

    expect(volumeDasSeries(series)).toBe(200 + 180);
  });

  it('ignora campos inválidos', () => {
    expect(volumeDasSeries({ a: serie({ repeticoes: '' }) })).toBe(0);
  });

  it('ajusta o campo sem passar de zero', () => {
    expect(ajustarCampo('20', 2.5)).toBe('22.5');
    expect(ajustarCampo('1,5', -2.5)).toBe('0');
    expect(ajustarCampo('', 1)).toBe('1');
  });
});

describe('minutosDesde com offset da API (P-A)', () => {
  const agora = Date.parse('2026-10-31T13:03:10Z'); // 10:03:10 em -03:00

  it('usa o offset recebido, não o fuso do aparelho', () => {
    expect(minutosDesde('2026-10-31T10:00:00-03:00', agora)).toBe(3);
    expect(minutosDesde('2026-10-31T13:00:00Z', agora)).toBe(3);
  });

  it('sem offset assume -03:00 (Brasília), nunca 3 h de erro', () => {
    expect(minutosDesde('2026-10-31T10:00:00', agora)).toBe(3);
  });
});

describe('minutosDesde (duração do Resumo)', () => {
  const inicio = new Date(2026, 9, 31, 8, 0, 0);

  it('conta do início da sessão no servidor, não da retomada da tela', () => {
    const agora = new Date(2026, 9, 31, 8, 3, 10).getTime();

    expect(minutosDesde(inicio.toISOString(), agora)).toBe(3);
  });

  it('mínimo de 1 minuto e tolera data inválida ou no futuro', () => {
    expect(minutosDesde(inicio.toISOString(), inicio.getTime() + 5000)).toBe(1);
    expect(minutosDesde('lixo')).toBe(1);
    expect(minutosDesde(inicio.toISOString(), inicio.getTime() - 60000)).toBe(1);
  });
});
