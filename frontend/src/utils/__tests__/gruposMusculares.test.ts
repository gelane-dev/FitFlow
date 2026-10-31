import { agruparGruposMusculares, pertenceAoGrupo } from '@/utils/gruposMusculares';

describe('agruparGruposMusculares', () => {
  it('une variações de caixa em um chip só', () => {
    expect(agruparGruposMusculares(['peito', 'Peito', 'PEITO', 'costas'])).toEqual([
      { chave: 'costas', rotulo: 'Costas' },
      { chave: 'peito', rotulo: 'Peito' },
    ]);
  });

  it('une variações de acento e prefere a forma acentuada', () => {
    expect(agruparGruposMusculares(['biceps', 'Bíceps', 'abdomen', 'Abdômen'])).toEqual([
      { chave: 'abdomen', rotulo: 'Abdômen' },
      { chave: 'biceps', rotulo: 'Bíceps' },
    ]);
  });

  it('ignora vazios e ordena em pt-BR', () => {
    expect(agruparGruposMusculares(['', '  ', 'ombros', 'Álgebra'])).toEqual([
      { chave: 'algebra', rotulo: 'Álgebra' },
      { chave: 'ombros', rotulo: 'Ombros' },
    ]);
  });

  it('lista vazia gera nenhum grupo', () => {
    expect(agruparGruposMusculares([])).toEqual([]);
  });
});

describe('pertenceAoGrupo', () => {
  it('compara sem caixa nem acento', () => {
    expect(pertenceAoGrupo('Bíceps', 'biceps')).toBe(true);
    expect(pertenceAoGrupo('PEITO', 'peito')).toBe(true);
    expect(pertenceAoGrupo('costas', 'peito')).toBe(false);
  });
});
