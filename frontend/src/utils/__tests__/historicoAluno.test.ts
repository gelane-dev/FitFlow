import { Execucao, SessaoResumo } from '@/types/sessao.types';
import {
  agruparSessoesPorMes,
  duracaoSessaoMin,
  formatarDuracao,
  recordePessoal,
  segundosParaMinutos,
  tendenciaDaCarga,
  totalSeries,
  volumeExecucoes,
} from '@/utils/historicoAluno';

function sessao(id: number, inicio: string, fim: string | null = null): SessaoResumo {
  return {
    id,
    treino_id: 1,
    treino_nome: 'A',
    ficha_id: 1,
    iniciada_em: inicio,
    finalizada_em: fim,
    esforco: null,
    comentario: null,
    total_execucoes: 0,
    total_series: 0,
    volume_total: 0,
    duracao_segundos: null,
  };
}

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

describe('duracaoSessaoMin / formatarDuracao', () => {
  it('calcula os minutos da sessão finalizada', () => {
    expect(duracaoSessaoMin(sessao(1, '2026-10-30T08:00:00', '2026-10-30T08:42:00'))).toBe(42);
  });

  it('devolve null em andamento ou com fim antes do início', () => {
    expect(duracaoSessaoMin(sessao(1, '2026-10-30T08:00:00'))).toBeNull();
    expect(duracaoSessaoMin(sessao(1, '2026-10-30T08:00:00', '2026-10-30T07:00:00'))).toBeNull();
  });

  it('formata minutos e horas', () => {
    expect(formatarDuracao(42)).toBe('42 min');
    expect(formatarDuracao(65)).toBe('1h05');
    expect(formatarDuracao(null)).toBe('—');
  });
});

describe('volumeExecucoes / totalSeries', () => {
  it('soma séries × reps × carga', () => {
    const lista = [
      execucao({ repeticoes_realizadas: 10, carga_utilizada: 20 }),
      execucao({ series_realizadas: 2, repeticoes_realizadas: 5, carga_utilizada: 10 }),
    ];

    expect(volumeExecucoes(lista)).toBe(200 + 100);
    expect(totalSeries(lista)).toBe(3);
    expect(volumeExecucoes([])).toBe(0);
  });
});

describe('agruparSessoesPorMes', () => {
  it('agrupa por mês, do mais recente ao mais antigo', () => {
    const grupos = agruparSessoesPorMes([
      sessao(1, '2026-09-30T08:00:00'),
      sessao(2, '2026-10-02T08:00:00'),
      sessao(3, '2026-10-20T08:00:00'),
    ]);

    expect(grupos.map((g) => g.titulo)).toEqual(['Outubro 2026', 'Setembro 2026']);
    expect(grupos[0].sessoes.map((s) => s.id)).toEqual([3, 2]);
  });

  it('lista vazia gera nenhum grupo', () => {
    expect(agruparSessoesPorMes([])).toEqual([]);
  });
});

describe('tendenciaDaCarga', () => {
  it('em alta quando a última carga é a máxima', () => {
    expect(tendenciaDaCarga(50, 50)).toBe('alta');
    expect(tendenciaDaCarga(40, 50)).toBe('queda');
  });
});

describe('recordePessoal', () => {
  it('devolve a maior carga e a primeira data em que ocorreu', () => {
    const pontos = [
      { data: '2026-10-01', carga_maxima: 40 },
      { data: '2026-10-08', carga_maxima: 50 },
      { data: '2026-10-15', carga_maxima: 50 },
      { data: '2026-10-22', carga_maxima: 45 },
    ];

    expect(recordePessoal(pontos)).toEqual({ carga: 50, data: '2026-10-08' });
  });

  it('devolve null sem pontos', () => {
    expect(recordePessoal([])).toBeNull();
  });
});

describe('segundosParaMinutos', () => {
  it('arredonda para minutos com mínimo de 1 e preserva null', () => {
    expect(segundosParaMinutos(2520)).toBe(42);
    expect(segundosParaMinutos(10)).toBe(1);
    expect(segundosParaMinutos(null)).toBeNull();
  });
});
