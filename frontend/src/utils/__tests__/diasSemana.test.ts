import { DIAS_SEMANA } from '@/types/ficha.types';
import {
  rotuloDiaCompleto,
  ROTULO_SEM_DIA_FIXO,
  rotuloDiaCurto,
  subtituloTreino,
  diaDoParametro,
  tituloTelaTreino,
} from '@/utils/diasSemana';

describe('rotuloDiaCurto', () => {
  it('abrevia e capitaliza todos os dias, na ordem dos valores da API', () => {
    expect(DIAS_SEMANA.map(rotuloDiaCurto)).toEqual([
      'Seg',
      'Ter',
      'Qua',
      'Qui',
      'Sex',
      'Sáb',
      'Dom',
    ]);
  });
});

describe('rotuloDiaCompleto', () => {
  it('capitaliza o dia', () => {
    expect(rotuloDiaCompleto('terça')).toBe('Terça');
    expect(rotuloDiaCompleto('sábado')).toBe('Sábado');
  });

  it('treino sem dia fixo (dia_semana nulo) vira "Sem dia fixo" (GB-06)', () => {
    expect(ROTULO_SEM_DIA_FIXO).toBe('Sem dia fixo');
    expect(rotuloDiaCompleto(null)).toBe('Sem dia fixo');
    expect(rotuloDiaCompleto(undefined)).toBe('Sem dia fixo');
    expect(rotuloDiaCompleto('')).toBe('Sem dia fixo');
  });
});

describe('títulos da tela de treino', () => {
  it('mostra o dia no título e aluno + ficha no subtítulo', () => {
    expect(tituloTelaTreino('segunda')).toBe('Treino de Segunda');
    expect(tituloTelaTreino('sábado')).toBe('Treino de Sábado');
    expect(tituloTelaTreino(undefined)).toBe('Treino');
    expect(tituloTelaTreino(null)).toBe('Treino · Sem dia fixo');
    expect(subtituloTreino('Ana Demo', 'Hipertrofia')).toBe('Ana Demo · Hipertrofia');
  });
});

describe('diaDoParametro (GB-11: nunca inventa um dia ao editar)', () => {
  it('aceita só dias válidos; vazio, nulo ou inválido = null (sem dia fixo)', () => {
    expect(diaDoParametro('terça')).toBe('terça');
    expect(diaDoParametro('sábado')).toBe('sábado');
    expect(diaDoParametro('')).toBeNull();
    expect(diaDoParametro(undefined)).toBeNull();
    expect(diaDoParametro(null)).toBeNull();
    expect(diaDoParametro('null')).toBeNull();
    expect(diaDoParametro('Segunda')).toBeNull();
  });
});
