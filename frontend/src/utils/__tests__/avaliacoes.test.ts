import { AvaliacaoResposta } from '@/types/avaliacao.types';
import {
  calcularImc,
  formatarVariacao,
  montarLinhasAvaliacao,
  setaVariacao,
  variacaoPeso,
} from '@/utils/avaliacoes';

function avaliacao(parcial: Partial<AvaliacaoResposta>): AvaliacaoResposta {
  return {
    id: 1,
    aluno_id: 1,
    professor_id: 1,
    data_avaliacao: '2026-10-01T00:00:00',
    peso: 80,
    altura: 1.8,
    imc: 24.69,
    ...parcial,
  };
}

describe('calcularImc', () => {
  it('peso / altura² com 2 casas', () => {
    expect(calcularImc(80, 1.8)).toBe(24.69);
    expect(calcularImc(70, 1.75)).toBe(22.86);
  });

  it('altura inválida devolve 0', () => {
    expect(calcularImc(80, 0)).toBe(0);
    expect(calcularImc(80, -1)).toBe(0);
  });
});

describe('variacaoPeso / formatarVariacao', () => {
  it('diferença com 1 casa; null sem anterior', () => {
    expect(variacaoPeso(avaliacao({ peso: 78.3 }), avaliacao({ peso: 80 }))).toBe(-1.7);
    expect(variacaoPeso(avaliacao({ peso: 80.1 }), avaliacao({ peso: 80 }))).toBe(0.1);
    expect(variacaoPeso(avaliacao({}), undefined)).toBeNull();
  });

  it('textos de variação', () => {
    expect(formatarVariacao(null)).toBe('Primeira avaliação');
    expect(formatarVariacao(0)).toBe('Peso inalterado');
    expect(formatarVariacao(1.5)).toBe('+1,5 kg');
    expect(formatarVariacao(-2)).toBe('−2,0 kg');
  });
});

describe('montarLinhasAvaliacao', () => {
  const a1 = avaliacao({ id: 1, data_avaliacao: '2026-08-01T00:00:00', peso: 82 });
  const a2 = avaliacao({ id: 2, data_avaliacao: '2026-09-01T00:00:00', peso: 80 });
  const a3 = avaliacao({ id: 3, data_avaliacao: '2026-10-01T00:00:00', peso: 79 });

  it('ordena desc e calcula a variação contra a anterior no tempo', () => {
    const linhas = montarLinhasAvaliacao([a2, a3, a1]);

    expect(linhas.map((l) => l.avaliacao.id)).toEqual([3, 2, 1]);
    expect(linhas.map((l) => l.variacao)).toEqual([-1, -2, null]);
  });

  it('usa o IMC calculado quando a resposta não traz', () => {
    const semImc = { ...a1, imc: undefined } as unknown as AvaliacaoResposta;

    expect(montarLinhasAvaliacao([semImc])[0].imc).toBe(calcularImc(82, 1.8));
    expect(montarLinhasAvaliacao([a1])[0].imc).toBe(24.69);
  });

  it('não altera o array recebido', () => {
    const entrada = [a1, a3, a2];
    montarLinhasAvaliacao(entrada);

    expect(entrada.map((a) => a.id)).toEqual([1, 3, 2]);
  });
});

describe('setaVariacao', () => {
  it('queda é melhora, alta é piora, igual e sem anterior são neutros', () => {
    expect(setaVariacao(-1.5)).toEqual({ seta: '↓', tom: 'melhora' });
    expect(setaVariacao(0.8)).toEqual({ seta: '↑', tom: 'piora' });
    expect(setaVariacao(0)).toEqual({ seta: '=', tom: 'neutro' });
    expect(setaVariacao(null)).toEqual({ seta: '', tom: 'neutro' });
  });
});
