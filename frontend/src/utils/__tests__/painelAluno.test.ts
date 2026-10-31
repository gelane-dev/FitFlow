import { SessaoResumo } from '@/types/sessao.types';
import {
  chaveDia,
  diasComTreino,
  descreverEmDias,
  diasDaSemana,
  estimarDuracaoMin,
  formatarVolume,
  nomeDiaSemana,
  proximoTreino,
  sequenciaDias,
  sessaoAberta,
  sessaoConcluidaHoje,
  sessoesDoMes,
  TEMPO_MEDIO_SERIE_S,
  volumeDasSessoes,
} from '@/utils/painelAluno';

function sessao(dia: string, finalizada = true): SessaoResumo {
  return {
    id: 1,
    treino_id: 1,
    treino_nome: 'A',
    ficha_id: 1,
    iniciada_em: `${dia}T08:00:00`,
    finalizada_em: finalizada ? `${dia}T09:00:00` : null,
    esforco: null,
    comentario: null,
    total_execucoes: 3,
    total_series: 0,
    volume_total: 0,
    duracao_segundos: null,
  };
}

// 2026-10-31 é sábado
const HOJE = new Date(2026, 9, 31);

describe('estimarDuracaoMin', () => {
  it('soma séries × (tempo médio + descanso)', () => {
    // 3×(40+60) + 4×(40+90) = 300 + 520 = 820 s → 14 min
    expect(estimarDuracaoMin([{ series: 3, descanso: 60 }, { series: 4, descanso: 90 }])).toBe(14);
    expect(TEMPO_MEDIO_SERIE_S).toBe(40);
  });

  it('devolve 0 sem séries e pelo menos 1 minuto com séries', () => {
    expect(estimarDuracaoMin([])).toBe(0);
    expect(estimarDuracaoMin([{ series: 0, descanso: 60 }])).toBe(0);
    expect(estimarDuracaoMin([{ series: 1, descanso: 0 }])).toBe(1);
  });
});

describe('diasDaSemana', () => {
  it('lista segunda a domingo e marca hoje', () => {
    const dias = diasDaSemana(HOJE);

    expect(dias.map((d) => d.chave)).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ]);
    expect(dias.map((d) => d.letra).join('')).toBe('STQQSSD');
    expect(dias.filter((d) => d.hoje).map((d) => d.chave)).toEqual(['2026-10-31']);
  });

  it('no domingo, a semana termina hoje', () => {
    const dias = diasDaSemana(new Date(2026, 10, 1));

    expect(dias[0].chave).toBe('2026-10-26');
    expect(dias[6].hoje).toBe(true);
  });
});

describe('diasComTreino / sessoesDoMes', () => {
  it('ignora sessões em andamento', () => {
    const dias = diasComTreino([sessao('2026-10-30'), sessao('2026-10-29', false)]);

    expect([...dias]).toEqual(['2026-10-30']);
  });

  it('filtra as finalizadas do mês', () => {
    const lista = [sessao('2026-10-02'), sessao('2026-09-30'), sessao('2026-10-10', false)];

    expect(sessoesDoMes(lista, HOJE)).toHaveLength(1);
  });
});

describe('sequenciaDias', () => {
  it('conta dias seguidos incluindo hoje', () => {
    const lista = [sessao('2026-10-31'), sessao('2026-10-30'), sessao('2026-10-28')];

    expect(sequenciaDias(lista, HOJE)).toBe(2);
  });

  it('parte de ontem quando hoje ainda não treinou', () => {
    expect(sequenciaDias([sessao('2026-10-30'), sessao('2026-10-29')], HOJE)).toBe(2);
  });

  it('zera se o último treino foi há mais de um dia', () => {
    expect(sequenciaDias([sessao('2026-10-28')], HOJE)).toBe(0);
    expect(sequenciaDias([], HOJE)).toBe(0);
  });
});

describe('formatos', () => {
  it('agrupa milhar com ponto', () => {
    expect(formatarVolume(12450.4)).toBe('12.450');
    expect(formatarVolume(950)).toBe('950');
    expect(formatarVolume(0)).toBe('0');
  });

  it('chaveDia e nomeDiaSemana usam a data local', () => {
    expect(chaveDia(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(nomeDiaSemana(HOJE)).toBe('sábado');
    expect(nomeDiaSemana(new Date(2026, 10, 3))).toBe('terça');
  });
});

describe('proximoTreino', () => {
  const treinos = [
    { id: 1, dia_semana: 'segunda' },
    { id: 2, dia_semana: 'quarta' },
    { id: 3, dia_semana: 'sábado' },
  ];

  it('escolhe o próximo dia depois de hoje (sábado → segunda)', () => {
    const proximo = proximoTreino(treinos, HOJE);

    expect(proximo?.treino.id).toBe(1);
    expect(proximo?.emDias).toBe(2);
  });

  it('o treino de hoje só volta na semana seguinte', () => {
    const quarta = new Date(2026, 10, 4);

    expect(proximoTreino(treinos, quarta)?.treino.id).toBe(3);
    expect(proximoTreino([{ dia_semana: 'quarta' }], quarta)?.emDias).toBe(7);
  });

  it('devolve null sem treinos ou com dia inválido', () => {
    expect(proximoTreino([], HOJE)).toBeNull();
    expect(proximoTreino([{ dia_semana: 'xyz' }], HOJE)).toBeNull();
  });

  it('descreve a distância', () => {
    expect(descreverEmDias(1)).toBe('amanhã');
    expect(descreverEmDias(3)).toBe('em 3 dias');
  });
});

describe('volumeDasSessoes', () => {
  it('soma o volume_total de cada sessão', () => {
    const a = { ...sessao('2026-10-30'), volume_total: 1200.5 };
    const b = { ...sessao('2026-10-29'), volume_total: 800 };
    expect(volumeDasSessoes([a, b])).toBe(2000.5);
    expect(volumeDasSessoes([])).toBe(0);
  });
});

describe('sessaoConcluidaHoje', () => {
  const dela = (id: number, treino: number, dia: string, finalizada = true) => ({
    ...sessao(dia, finalizada),
    id,
    treino_id: treino,
  });

  it('acha a sessão finalizada hoje do treino', () => {
    const lista = [dela(1, 7, '2026-10-30'), dela(2, 7, '2026-10-31'), dela(3, 8, '2026-10-31')];

    expect(sessaoConcluidaHoje(lista, 7, HOJE)?.id).toBe(2);
  });

  it('ignora sessão aberta, outro dia e outro treino', () => {
    const lista = [dela(1, 7, '2026-10-31', false), dela(2, 7, '2026-10-30'), dela(3, 8, '2026-10-31')];

    expect(sessaoConcluidaHoje(lista, 7, HOJE)).toBeUndefined();
  });

  it('com várias no dia devolve a mais recente', () => {
    const lista = [
      { ...dela(1, 7, '2026-10-31'), iniciada_em: '2026-10-31T07:00:00' },
      { ...dela(2, 7, '2026-10-31'), iniciada_em: '2026-10-31T18:00:00' },
    ];

    expect(sessaoConcluidaHoje(lista, 7, HOJE)?.id).toBe(2);
  });
});

describe('sessaoAberta (P-D)', () => {
  it('acha a sessão aberta de qualquer treino, a mais recente primeiro', () => {
    const lista = [
      { ...sessao('2026-10-30', false), id: 1, treino_id: 3 },
      { ...sessao('2026-10-31', false), id: 2, treino_id: 4 },
      { ...sessao('2026-10-31'), id: 3, treino_id: 5 },
    ];

    expect(sessaoAberta(lista)?.id).toBe(2);
    expect(sessaoAberta(lista, 3)?.id).toBe(1);
    expect(sessaoAberta(lista, 5)).toBeUndefined();
    expect(sessaoAberta([])).toBeUndefined();
  });
});
