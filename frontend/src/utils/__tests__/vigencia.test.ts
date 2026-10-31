import {
  dataValida,
  descreverVigencia,
  formatarImc,
  lerNumero,
} from '@/utils/vigencia';

describe('descreverVigencia', () => {
  it('período completo, só início e sem datas', () => {
    expect(descreverVigencia('2026-10-30', '2026-11-30')).toBe(
      '30/10/2026 → 30/11/2026'
    );
    expect(descreverVigencia('2026-10-30', null)).toBe('Desde 30/10/2026');
    expect(descreverVigencia(null, null)).toBe('');
    expect(descreverVigencia(null, '2026-11-30')).toBe('');
  });
});

describe('dataValida', () => {
  it('aceita data real e vazio (campo opcional)', () => {
    expect(dataValida('2026-10-30')).toBe(true);
    expect(dataValida('2028-02-29')).toBe(true);
    expect(dataValida('')).toBe(true);
    expect(dataValida('   ')).toBe(true);
  });

  it('rejeita formato errado e datas inexistentes', () => {
    expect(dataValida('30/10/2026')).toBe(false);
    expect(dataValida('2026-1-3')).toBe(false);
    expect(dataValida('2026-02-30')).toBe(false);
    expect(dataValida('2027-02-29')).toBe(false);
    expect(dataValida('2026-13-01')).toBe(false);
  });
});

describe('lerNumero (vigência)', () => {
  it('converte vírgula e ponto; NaN para vazio e inválido', () => {
    expect(lerNumero('12,5')).toBe(12.5);
    expect(lerNumero('12.5')).toBe(12.5);
    expect(lerNumero(' 70 ')).toBe(70);
    expect(lerNumero('')).toBeNaN();
    expect(lerNumero('x')).toBeNaN();
  });
});

describe('formatarImc', () => {
  it('2 casas ou traço', () => {
    expect(formatarImc(22.857)).toBe('22,86');
    expect(formatarImc(0)).toBe('0,00');
    expect(formatarImc(null)).toBe('—');
    expect(formatarImc(undefined)).toBe('—');
  });
});
