import {
  deslocarMes,
  entradasPorMes,
  formatarMoedaCompacta,
  dinheiroParaNumero,
  mesParaData,
  montarAlunosPorPlano,
  montarAlunosPorProfessor,
  montarAtivosInativos,
  montarCadastrosPorMes,
  montarFrequencia,
  montarRecebidoPorForma,
  montarRecebidoPorMes,
  periodoDoMes,
  ROTULO_SEM_PROFESSOR,
  rotuloMes,
  rotuloMesDaData,
  rotuloPeriodo,
} from '../painelAdmin';

const SERIES_VAZIAS = {
  cadastros_por_mes: [],
  frequencia_por_mes: [],
  ativos_inativos: { ativos: 0, inativos: 0 },
};

describe('rotuloMes / mesParaData', () => {
  it('rotuloMesDaData usa só ano e mês da data', () => {
    expect(rotuloMesDaData('2026-11-01')).toBe('nov/26');
  });


  it('abrevia o mês', () => {
    expect(rotuloMes('2026-11')).toBe('nov/26');
    expect(rotuloMes('2025-01')).toBe('jan/25');
  });

  it('devolve o texto original quando não é um mês', () => {
    expect(rotuloMes('sem_data')).toBe('sem_data');
    expect(rotuloMes('2026-13')).toBe('2026-13');
  });

  it('gera o primeiro dia do mês só para meses válidos', () => {
    expect(mesParaData('2026-02')).toBe('2026-02-01');
    expect(mesParaData('sem_data')).toBeNull();
  });
});

describe('montarCadastrosPorMes', () => {
  it('separa sem_data da série e ordena por mês', () => {
    const resultado = montarCadastrosPorMes({
      ...SERIES_VAZIAS,
      cadastros_por_mes: [
        { mes: '2026-11', total: 4 },
        { mes: '2026-09', total: 2 },
        { mes: 'sem_data', total: 7 },
        { mes: '2026-10', total: 0 },
      ],
    });

    expect(resultado.barras).toEqual([
      { rotulo: 'set/26', valor: 2 },
      { rotulo: 'out/26', valor: 0 },
      { rotulo: 'nov/26', valor: 4 },
    ]);
    expect(resultado.semData).toBe(7);
    expect(resultado.totalComData).toBe(6);
  });

  it('aceita o campo separado series.sem_data', () => {
    const resultado = montarCadastrosPorMes({
      ...SERIES_VAZIAS,
      cadastros_por_mes: [{ mes: '2026-11', total: 1 }],
      sem_data: 3,
    });

    expect(resultado.barras).toHaveLength(1);
    expect(resultado.semData).toBe(3);
  });

  it('sem registros devolve tudo vazio', () => {
    expect(montarCadastrosPorMes(SERIES_VAZIAS)).toEqual({ barras: [], semData: 0, totalComData: 0 });
  });
});

describe('montarFrequencia', () => {
  it('ordena e separa entradas (barras) de alunos distintos (linha)', () => {
    const resultado = montarFrequencia([
      { mes: '2026-11', entradas: 10, alunos_distintos: 4 },
      { mes: '2026-10', entradas: 6, alunos_distintos: 3 },
    ]);

    expect(resultado.entradas).toEqual([
      { rotulo: 'out/26', valor: 6 },
      { rotulo: 'nov/26', valor: 10 },
    ]);
    expect(resultado.alunosDistintos).toEqual([
      { data: '2026-10-01', valor: 3 },
      { data: '2026-11-01', valor: 4 },
    ]);
    expect(resultado.totalEntradas).toBe(16);
  });
});

describe('séries de contagem', () => {
  it('alunos por plano: maiores primeiro, empate mantém a ordem original', () => {
    expect(
      montarAlunosPorPlano([
        { plano_id: 1, nome: 'Mensal', total: 2 },
        { plano_id: 2, nome: 'Anual', total: 9 },
        { plano_id: 3, nome: 'Trimestral', total: 2 },
      ]).map((d) => d.rotulo)
    ).toEqual(['Anual', 'Mensal', 'Trimestral']);
  });

  it('alunos por professor: professor nulo vira "Sem professor"', () => {
    expect(
      montarAlunosPorProfessor([
        { professor_id: null, nome: '', total: 5 },
        { professor_id: 1, nome: 'Carlos', total: 1 },
      ])
    ).toEqual([
      { rotulo: ROTULO_SEM_PROFESSOR, valor: 5 },
      { rotulo: 'Carlos', valor: 1 },
    ]);
  });

  it('ativos x inativos', () => {
    expect(montarAtivosInativos({ ativos: 3, inativos: 1 })).toEqual([
      { rotulo: 'Ativos', valor: 3 },
      { rotulo: 'Inativos', valor: 1 },
    ]);
  });
});

describe('financeiro', () => {
  it('converte dinheiro em número só para o gráfico', () => {
    expect(dinheiroParaNumero('1234.50')).toBe(1234.5);
    expect(dinheiroParaNumero(null)).toBe(0);
    expect(dinheiroParaNumero('abc')).toBe(0);
  });

  it('recebido por mês em ordem cronológica', () => {
    expect(
      montarRecebidoPorMes([
        { mes: '2026-11', total: '100.00' },
        { mes: '2026-10', total: '50.50' },
      ])
    ).toEqual([
      { rotulo: 'out/26', valor: 50.5 },
      { rotulo: 'nov/26', valor: 100 },
    ]);
  });

  it('recebido por forma usa o rótulo da forma, do maior para o menor', () => {
    expect(
      montarRecebidoPorForma([
        { forma: 'pix', total: '10.00' },
        { forma: 'cartao_credito', total: '80.00' },
      ])
    ).toEqual([
      { rotulo: 'Cartão de crédito', valor: 80 },
      { rotulo: 'Pix', valor: 10 },
    ]);
  });
});

describe('período', () => {
  it('mês atual: primeiro e último dia', () => {
    expect(periodoDoMes(new Date(2026, 10, 9))).toEqual({ inicio: '2026-11-01', fim: '2026-11-30' });
    expect(periodoDoMes(new Date(2028, 1, 10))).toEqual({ inicio: '2028-02-01', fim: '2028-02-29' });
  });

  it('desloca meses atravessando o ano', () => {
    const nov = periodoDoMes(new Date(2026, 10, 9));

    expect(deslocarMes(nov, -11)).toEqual({ inicio: '2025-12-01', fim: '2025-12-31' });
    expect(deslocarMes(nov, 2)).toEqual({ inicio: '2027-01-01', fim: '2027-01-31' });
  });

  it('rótulo do período', () => {
    expect(rotuloPeriodo({ inicio: '2026-11-01', fim: '2026-11-30' })).toBe('nov/26');
    expect(rotuloPeriodo({ inicio: '2026-11-03', fim: '2026-11-15' })).toBe('03/11 a 15/11');
    expect(rotuloPeriodo({})).toBe('Mês atual');
  });
});

describe('entradasPorMes', () => {
  it('soma as semanas por mês e ordena', () => {
    expect(
      entradasPorMes([
        { semana_inicio: '2026-11-02', total: 2 },
        { semana_inicio: '2026-10-26', total: 1 },
        { semana_inicio: '2026-11-09', total: 3 },
      ])
    ).toEqual([
      { rotulo: 'out/26', valor: 1 },
      { rotulo: 'nov/26', valor: 5 },
    ]);
  });

  it('aceita o campo antigo "semana" e ignora datas inválidas ou lista vazia', () => {
    expect(entradasPorMes([{ semana: '2026-11-02', total: 4 }, { total: 9 }])).toEqual([{ rotulo: 'nov/26', valor: 4 }]);
    expect(entradasPorMes(null)).toEqual([]);
  });
});

describe('formatarMoedaCompacta', () => {
  it('abrevia valores', () => {
    expect(formatarMoedaCompacta(0)).toBe('0');
    expect(formatarMoedaCompacta(850)).toBe('R$ 850');
    expect(formatarMoedaCompacta(1250)).toBe('R$ 1,3 mil');
    expect(formatarMoedaCompacta(3000)).toBe('R$ 3 mil');
    expect(formatarMoedaCompacta(2500000)).toBe('R$ 2,5 mi');
    expect(formatarMoedaCompacta(NaN)).toBe('0');
  });
});
