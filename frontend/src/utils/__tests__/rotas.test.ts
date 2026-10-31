import { rotaExecucaoTreino, rotaInicialDoPerfil, rotaPreviaTreino } from '@/utils/rotas';

describe('rotaInicialDoPerfil', () => {
  it('professor em /painel; aluno e admin em /aluno; sem login em /', () => {
    expect(rotaInicialDoPerfil('professor')).toBe('/painel');
    expect(rotaInicialDoPerfil('aluno')).toBe('/aluno');
    expect(rotaInicialDoPerfil('admin')).toBe('/aluno');
    expect(rotaInicialDoPerfil(undefined)).toBe('/');
    expect(rotaInicialDoPerfil(null)).toBe('/');
  });
});

describe('rotas do treino do aluno', () => {
  it('a prévia leva o fichaId e a execução mantém o path original', () => {
    expect(rotaPreviaTreino({ id: 7, ficha_id: 2 })).toBe('/aluno/treino/7/previa?fichaId=2');
    expect(rotaExecucaoTreino(7)).toBe('/aluno/treino/7');
  });
});
