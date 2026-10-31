import { primeiroNome, rotuloData, saudacao } from '@/utils/saudacao';

describe('saudacao', () => {
  it('escolhe a saudação pela hora', () => {
    expect(saudacao(4)).toBe('Boa noite');
    expect(saudacao(5)).toBe('Bom dia');
    expect(saudacao(11)).toBe('Bom dia');
    expect(saudacao(12)).toBe('Boa tarde');
    expect(saudacao(17)).toBe('Boa tarde');
    expect(saudacao(18)).toBe('Boa noite');
    expect(saudacao(23)).toBe('Boa noite');
  });
});

describe('rotuloData', () => {
  it('formata dia da semana, dia e mês em maiúsculas', () => {
    expect(rotuloData(new Date(2026, 9, 31))).toBe('SÁBADO, 31 OUT');
    expect(rotuloData(new Date(2026, 0, 5))).toBe('SEGUNDA, 5 JAN');
  });
});

describe('primeiroNome', () => {
  it('devolve a primeira palavra', () => {
    expect(primeiroNome('Maria da Silva')).toBe('Maria');
    expect(primeiroNome('  João ')).toBe('João');
    expect(primeiroNome(null)).toBe('');
    expect(primeiroNome('')).toBe('');
  });
});
