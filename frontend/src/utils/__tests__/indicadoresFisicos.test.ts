import { AvaliacaoResposta } from '@/types/avaliacao.types';
import { PontoEvolucao } from '@/types/evolucao.types';
import {
  avaliacoesRecentesPrimeiro,
  indicadorPorChave,
  pontosDoIndicador,
  ultimasDuasMedicoes,
} from '@/utils/indicadoresFisicos';
import { pontosDaMetrica, progressoDoPeriodo } from '@/utils/progressoEvolucao';

function avaliacao(id: number, data: string, extra: Partial<AvaliacaoResposta> = {}): AvaliacaoResposta {
  return {
    id,
    aluno_id: 1,
    professor_id: 2,
    data_avaliacao: data,
    peso: 70,
    altura: 1.75,
    imc: 22.9,
    percentual_gordura: null,
    massa_muscular: null,
    observacao: null,
    ...extra,
  };
}

describe('pontosDoIndicador', () => {
  it('ignora null: não vira ponto nem zero', () => {
    const lista = [
      avaliacao(1, '2026-10-01', { percentual_gordura: 20 }),
      avaliacao(2, '2026-10-08', { percentual_gordura: null }),
      avaliacao(3, '2026-10-15', { percentual_gordura: 18 }),
    ];

    expect(pontosDoIndicador(lista, 'percentual_gordura')).toEqual([
      { data: '2026-10-01', valor: 20 },
      { data: '2026-10-15', valor: 18 },
    ]);
  });

  it('aceita o valor 0 de verdade (só null/ausente é ignorado)', () => {
    const lista = [avaliacao(1, '2026-10-01', { massa_muscular: 0 })];

    expect(pontosDoIndicador(lista, 'massa_muscular')).toEqual([{ data: '2026-10-01', valor: 0 }]);
  });

  it('ordena em ordem crescente de data, qualquer que seja a ordem recebida', () => {
    const lista = [
      avaliacao(3, '2026-10-15', { peso: 72 }),
      avaliacao(1, '2026-10-01', { peso: 70 }),
      avaliacao(2, '2026-10-08', { peso: 71 }),
    ];

    expect(pontosDoIndicador(lista, 'peso').map((p) => p.valor)).toEqual([70, 71, 72]);
  });

  it('sem avaliações, lista vazia', () => {
    expect(pontosDoIndicador([], 'peso')).toEqual([]);
  });

  it('não altera a lista recebida', () => {
    const lista = [avaliacao(2, '2026-10-08'), avaliacao(1, '2026-10-01')];

    pontosDoIndicador(lista, 'peso');
    expect(lista.map((a) => a.id)).toEqual([2, 1]);
  });
});

describe('ultimasDuasMedicoes', () => {
  it('sem pontos, nada', () => {
    expect(ultimasDuasMedicoes([])).toBeNull();
  });

  it('um ponto: sem anterior (primeira avaliação)', () => {
    expect(ultimasDuasMedicoes([{ data: 'a', valor: 1 }])).toEqual({
      atual: { data: 'a', valor: 1 },
      anterior: null,
    });
  });

  it('usa as duas mais recentes que têm o indicador', () => {
    const lista = [
      avaliacao(1, '2026-10-01', { massa_muscular: 30 }),
      avaliacao(2, '2026-10-08'),
      avaliacao(3, '2026-10-15', { massa_muscular: 32 }),
    ];
    const resultado = ultimasDuasMedicoes(pontosDoIndicador(lista, 'massa_muscular'))!;

    expect(resultado.atual.valor).toBe(32);
    expect(resultado.anterior?.valor).toBe(30);
  });
});

describe('indicadores e histórico', () => {
  it('direções favoráveis do contrato', () => {
    expect(indicadorPorChave('peso').direcao).toBe('neutra');
    expect(indicadorPorChave('percentual_gordura').direcao).toBe('queda');
    expect(indicadorPorChave('massa_muscular').direcao).toBe('alta');
    expect(indicadorPorChave('imc').direcao).toBe('neutra');
  });

  it.each([
    ['ordem crescente', [3, 4]],
    ['ordem decrescente (como a API entrega)', [4, 3]],
  ])('mesma data: desempata por id, %s (QA-EV04-01)', (_nome, ordem) => {
    const todas: Record<number, AvaliacaoResposta> = {
      3: avaliacao(3, '2026-10-31', { peso: 70.5, imc: 24.39 }),
      4: avaliacao(4, '2026-10-31', { peso: 71, imc: 24.57 }),
    };
    const lista = ordem.map((id) => todas[id]);

    const medicoes = ultimasDuasMedicoes(pontosDoIndicador(lista, 'peso'))!;
    expect(medicoes.atual.valor).toBe(71);
    expect(medicoes.anterior?.valor).toBe(70.5);

    const imc = ultimasDuasMedicoes(pontosDoIndicador(lista, 'imc'))!;
    expect(imc.atual.valor).toBe(24.57);
    expect(imc.anterior?.valor).toBe(24.39);

    // O histórico concorda: o id 4 é o "mais recente".
    expect(avaliacoesRecentesPrimeiro(lista).map((a) => a.id)).toEqual([4, 3]);
  });

  it('histórico do mais recente para o mais antigo, sem mutar a entrada', () => {
    const lista = [avaliacao(1, '2026-10-01'), avaliacao(2, '2026-10-15')];

    expect(avaliacoesRecentesPrimeiro(lista).map((a) => a.id)).toEqual([2, 1]);
    expect(lista.map((a) => a.id)).toEqual([1, 2]);
  });
});

describe('progresso do período', () => {
  const ponto = (data: string, carga: number): PontoEvolucao => ({
    data,
    carga_maxima: carga,
    volume: carga * 10,
    registros: 1,
    repeticoes_maximas: 10,
    series: 3,
  });

  it('escolhe a métrica de cada ponto', () => {
    expect(pontosDaMetrica([ponto('2026-11-01', 40)], 'volume')).toEqual([{ data: '2026-11-01', valor: 400 }]);
    expect(pontosDaMetrica([ponto('2026-11-01', 40)], 'repeticoes_maximas')).toEqual([
      { data: '2026-11-01', valor: 10 },
    ]);
  });

  it('menos de dois pontos: sem progresso', () => {
    expect(progressoDoPeriodo([])).toBeNull();
    expect(progressoDoPeriodo([{ data: 'a', valor: 5 }])).toBeNull();
  });

  it('compara o primeiro com o último ponto do período', () => {
    const progresso = progressoDoPeriodo([
      { data: '2026-10-01', valor: 40 },
      { data: '2026-10-08', valor: 60 },
      { data: '2026-10-15', valor: 50 },
    ])!;

    expect(progresso.variacao).toEqual({ absoluta: 10, percentual: 25, sentido: 'subiu' });
    expect(progresso.inicial.data).toBe('2026-10-01');
    expect(progresso.final.data).toBe('2026-10-15');
  });

  it('primeiro valor 0: percentual null', () => {
    const progresso = progressoDoPeriodo([
      { data: 'a', valor: 0 },
      { data: 'b', valor: 5 },
    ])!;

    expect(progresso.variacao.percentual).toBeNull();
  });
});
