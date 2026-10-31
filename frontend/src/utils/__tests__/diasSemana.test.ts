import { DIAS_SEMANA } from '@/types/ficha.types';
import {
  rotuloDiaCompleto,
  rotuloDiaCurto,
  subtituloTreino,
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
});

describe('títulos da tela de treino', () => {
  it('mostra o dia no título e aluno + ficha no subtítulo', () => {
    expect(tituloTelaTreino('segunda')).toBe('Treino de Segunda');
    expect(tituloTelaTreino('sábado')).toBe('Treino de Sábado');
    expect(tituloTelaTreino(undefined)).toBe('Treino');
    expect(subtituloTreino('Ana Demo', 'Hipertrofia')).toBe('Ana Demo · Hipertrofia');
  });
});
