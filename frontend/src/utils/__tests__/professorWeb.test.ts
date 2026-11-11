import { AvaliacaoResposta } from '@/types/avaliacao.types';
import { FrequenciaAluno } from '@/types/professorWeb.types';
import {
  dadosFrequencia,
  errosMedidas,
  formatarDataHora,
  mediaSemanal,
  medidasComDados,
  medidasDaAvaliacao,
  medidasParaApi,
  medidasPreenchidas,
  medidasVazias,
  podeEditarExercicio,
  pontosDaMedida,
  rotuloOrigemExercicio,
  rotuloSemana,
} from '@/utils/professorWeb';

const base: AvaliacaoResposta = {
  id: 1,
  aluno_id: 1,
  professor_id: 1,
  data_avaliacao: '2026-09-01T10:00:00',
  peso: 80,
  altura: 1.8,
  imc: 24.7,
};

describe('circunferências', () => {
  it('medidasVazias tem as 9 medidas em branco', () => {
    expect(Object.keys(medidasVazias())).toHaveLength(9);
    expect(Object.values(medidasVazias()).every((v) => v === '')).toBe(true);
  });

  it('lê da avaliação (nulos viram vazio) e volta para a API (vazio vira null)', () => {
    const campos = medidasDaAvaliacao({ ...base, cintura: 82.5, peito: null });

    expect(campos.cintura).toBe('82.5');
    expect(campos.peito).toBe('');
    expect(medidasParaApi({ ...campos, quadril: '98,5' })).toMatchObject({
      cintura: 82.5,
      quadril: 98.5,
      peito: null,
    });
  });

  it('valida entre 0 (exclusive) e 300 cm', () => {
    expect(errosMedidas({ ...medidasVazias(), cintura: '300' })).toEqual({});
    expect(Object.keys(errosMedidas({ ...medidasVazias(), cintura: '0', quadril: '300,1', peito: '-2' }))).toEqual([
      'cintura',
      'quadril',
      'peito',
    ]);
  });

  it('lista só as preenchidas, na ordem de exibição', () => {
    const lista = medidasPreenchidas({ ...base, panturrilha: 38, cintura: 82 });

    expect(lista.map((m) => [m.rotulo, m.valor])).toEqual([
      ['Cintura', 82],
      ['Panturrilha', 38],
    ]);
  });

  it('pontosDaMedida ordena por data e ignora avaliações sem a medida', () => {
    const avaliacoes: AvaliacaoResposta[] = [
      { ...base, id: 3, data_avaliacao: '2026-11-01T10:00:00', cintura: 80 },
      { ...base, id: 2, data_avaliacao: '2026-10-01T10:00:00' },
      { ...base, id: 1, data_avaliacao: '2026-09-01T10:00:00', cintura: 84 },
    ];

    expect(pontosDaMedida(avaliacoes, 'cintura')).toEqual([
      { data: '2026-09-01T10:00:00', valor: 84 },
      { data: '2026-11-01T10:00:00', valor: 80 },
    ]);
    expect(pontosDaMedida(avaliacoes, 'peito')).toEqual([]);
    expect(medidasComDados(avaliacoes)).toEqual(['cintura']);
  });
});

describe('frequência', () => {
  const frequencia: FrequenciaAluno = {
    entradas_por_semana: [
      { semana_inicio: '2026-11-09', total: 4 },
      { semana_inicio: '2026-11-02', total: 2 },
    ],
    total_periodo: 6,
    ultima_entrada: '2026-11-10T07:45:00-03:00',
    sessoes_treino_periodo: 5,
  };

  it('rótulo da semana e ordem cronológica', () => {
    expect(rotuloSemana('2026-11-02')).toBe('02/11');
    expect(dadosFrequencia(frequencia)).toEqual([
      { rotulo: '02/11', valor: 2 },
      { rotulo: '09/11', valor: 4 },
    ]);
  });

  it('média por semana com 1 casa; zero sem semanas', () => {
    expect(mediaSemanal(frequencia)).toBe(3);
    expect(mediaSemanal({ ...frequencia, total_periodo: 7 })).toBe(3.5);
    expect(mediaSemanal({ ...frequencia, entradas_por_semana: [], total_periodo: 0 })).toBe(0);
  });

  it('formata data e hora da API ou traço quando ausente', () => {
    expect(formatarDataHora(frequencia.ultima_entrada)).toBe('10/11/2026 às 07:45');
    expect(formatarDataHora('2026-11-10')).toBe('10/11/2026');
    expect(formatarDataHora(null)).toBe('—');
  });
});

describe('exercícios do professor', () => {
  it('biblioteca e próprios são editáveis; de outro professor, não', () => {
    expect(podeEditarExercicio({ criado_por_professor_id: null }, 3)).toBe(true);
    expect(podeEditarExercicio({}, null)).toBe(true);
    expect(podeEditarExercicio({ criado_por_professor_id: 3 }, 3)).toBe(true);
    expect(podeEditarExercicio({ criado_por_professor_id: 4 }, 3)).toBe(false);
    expect(podeEditarExercicio({ criado_por_professor_id: 3 }, null)).toBe(false);
  });

  it('rótulo da origem', () => {
    expect(rotuloOrigemExercicio({ criado_por_professor_id: null }, 3)).toBe('Biblioteca');
    expect(rotuloOrigemExercicio({ criado_por_professor_id: 3 }, 3)).toBe('Meu exercício');
    expect(rotuloOrigemExercicio({ criado_por_professor_id: 4 }, 3)).toBe('Outro professor');
  });
});
