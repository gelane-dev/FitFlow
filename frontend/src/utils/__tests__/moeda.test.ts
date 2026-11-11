import { converterEntradaParaDecimal, formatarMoeda } from '@/utils/moeda';

describe('formatarMoeda', () => {
  it.each([
    ['99.90', 'R$ 99,90'],
    ['0.05', 'R$ 0,05'],
    ['0', 'R$ 0,00'],
    ['5', 'R$ 5,00'],
    ['1234.5', 'R$ 1.234,50'],
    ['1234567.89', 'R$ 1.234.567,89'],
    ['1000.00', 'R$ 1.000,00'],
    ['-10.00', '-R$ 10,00'],
  ])('%s -> %s', (entrada, esperado) => {
    expect(formatarMoeda(entrada)).toBe(esperado);
  });

  it('não perde centavos em valores grandes (sem float)', () => {
    expect(formatarMoeda('9007199254740993.99')).toBe('R$ 9.007.199.254.740.993,99');
  });

  it('vazio, nulo e inválido viram traço', () => {
    expect(formatarMoeda('')).toBe('—');
    expect(formatarMoeda(null)).toBe('—');
    expect(formatarMoeda(undefined)).toBe('—');
    expect(formatarMoeda('abc')).toBe('—');
    expect(formatarMoeda('1,50')).toBe('—');
  });
});

describe('converterEntradaParaDecimal', () => {
  it.each([
    ['1.234,50', '1234.50'],
    ['1234,5', '1234.50'],
    ['1234', '1234.00'],
    ['0,99', '0.99'],
    ['10,00', '10.00'],
    ['R$ 1.234,56', '1234.56'],
    ['1.000', '1000.00'],
    ['1.234.567,89', '1234567.89'],
    ['12.5', '12.50'],
    ['007,10', '7.10'],
    ['  45  ', '45.00'],
  ])('%s -> %s', (entrada, esperado) => {
    expect(converterEntradaParaDecimal(entrada)).toBe(esperado);
  });

  it('preserva centavos sem float', () => {
    expect(converterEntradaParaDecimal('0,07')).toBe('0.07');
    expect(converterEntradaParaDecimal('9007199254740993,99')).toBe('9007199254740993.99');
  });

  it.each(['', '   ', 'R$', 'abc', '-5', '1,234', '1,2,3', '12,5a', '1.2.3', '10,', ',50', '1.23,4.5'])(
    'inválido ou vazio %j -> null',
    (entrada) => {
      expect(converterEntradaParaDecimal(entrada)).toBeNull();
    }
  );
});
