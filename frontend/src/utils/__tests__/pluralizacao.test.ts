import {
  comUnidade,
  descreverTreino,
  ESPACO_FIXO,
  inicialMaiuscula,
  plural,
  pluralizar,
} from '@/utils/pluralizacao';

describe('pluralizar', () => {
  it('usa o singular só para 1', () => {
    expect(pluralizar(1, 'dia')).toBe(`1${ESPACO_FIXO}dia`);
    expect(pluralizar(2, 'dia')).toBe(`2${ESPACO_FIXO}dias`);
    expect(pluralizar(0, 'dia')).toBe(`0${ESPACO_FIXO}dias`);
  });

  it('aceita plural irregular', () => {
    expect(pluralizar(3, 'série', 'séries')).toBe(`3${ESPACO_FIXO}séries`);
    expect(pluralizar(2, 'mês', 'meses')).toBe(`2${ESPACO_FIXO}meses`);
  });
});

describe('comUnidade', () => {
  it('prende a unidade ao número com espaço que não quebra', () => {
    expect(comUnidade('128,5', 'kg')).toBe(`128,5${ESPACO_FIXO}kg`);
    expect(comUnidade(10, 'kg')).not.toContain(' ');
  });
});

describe('descreverTreino', () => {
  it('descreve exercícios e duração no plural certo e sem capitalizar', () => {
    expect(descreverTreino(3, 16)).toBe(`3${ESPACO_FIXO}exercícios · ~16${ESPACO_FIXO}min`);
    expect(descreverTreino(1, 5)).toBe(`1${ESPACO_FIXO}exercício · ~5${ESPACO_FIXO}min`);
  });

  it('omite a duração quando é 0', () => {
    expect(descreverTreino(2, 0)).toBe(`2${ESPACO_FIXO}exercícios`);
  });
});

describe('plural e inicialMaiuscula', () => {
  it('devolve só a palavra no número certo', () => {
    expect(plural(1, 'dia')).toBe('dia');
    expect(plural(0, 'dia')).toBe('dias');
    expect(plural(5, 'mês', 'meses')).toBe('meses');
  });

  it('capitaliza só a primeira letra', () => {
    expect(inicialMaiuscula('terça')).toBe('Terça');
    expect(inicialMaiuscula('')).toBe('');
  });
});
