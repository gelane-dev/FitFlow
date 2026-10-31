import { filtrarPorCampos, filtrarPorNome, normalizar } from '@/utils/busca';

const exercicios = [
  { nome: 'Supino Reto' },
  { nome: 'Agachamento Búlgaro' },
  { nome: 'Rosca Direta' },
];

describe('filtrarPorNome', () => {
  it('ignora acentos e caixa', () => {
    expect(filtrarPorNome(exercicios, 'bulgaro')).toEqual([exercicios[1]]);
    expect(filtrarPorNome(exercicios, 'SUPINO')).toEqual([exercicios[0]]);
    expect(filtrarPorNome([{ nome: 'Pé' }], 'pe')).toHaveLength(1);
  });

  it('busca parcial no meio do nome', () => {
    expect(filtrarPorNome(exercicios, 'ta')).toEqual([exercicios[2]]);
  });

  it('busca vazia ou só espaços devolve tudo; sem resultado devolve []', () => {
    expect(filtrarPorNome(exercicios, '')).toBe(exercicios);
    expect(filtrarPorNome(exercicios, '   ')).toBe(exercicios);
    expect(filtrarPorNome(exercicios, 'zzz')).toEqual([]);
  });
});

describe('filtrarPorCampos', () => {
  const fichas = [
    { nome: 'Hipertrofia', aluno: 'João Pedro' },
    { nome: 'Definição', aluno: 'Maria' },
  ];
  const campos = (f: { nome: string; aluno: string }) => [f.nome, f.aluno];

  it('procura em todos os campos, sem acentos nem caixa', () => {
    expect(filtrarPorCampos(fichas, 'joao', campos)).toEqual([fichas[0]]);
    expect(filtrarPorCampos(fichas, 'DEFINICAO', campos)).toEqual([fichas[1]]);
  });

  it('busca vazia devolve a mesma lista; campo nulo é ignorado', () => {
    expect(filtrarPorCampos(fichas, ' ', campos)).toBe(fichas);
    expect(filtrarPorCampos(fichas, 'x', () => [null, undefined])).toEqual([]);
  });
});

describe('normalizar', () => {
  it('remove acentos, caixa e espaços das pontas', () => {
    expect(normalizar('  Ábdômen ')).toBe('abdomen');
  });
});
