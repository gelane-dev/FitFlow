import {
  dataBrParaIso,
  dataBrValida,
  formatarData,
  lerInstante,
  mascararData,
} from '@/utils/datas';

describe('formatarData', () => {
  it('converte data e datetime ISO para dd/mm/aaaa', () => {
    expect(formatarData('2026-10-30')).toBe('30/10/2026');
    expect(formatarData('2026-10-30T08:00:00')).toBe('30/10/2026');
  });

  it('devolve o texto original quando não é uma data', () => {
    expect(formatarData('hoje')).toBe('hoje');
    expect(formatarData('')).toBe('');
  });
});

describe('mascararData', () => {
  it.each([
    ['', ''],
    ['3', '3'],
    ['31', '31'],
    ['311', '31/1'],
    ['3110', '31/10'],
    ['31102', '31/10/2'],
    ['31102026', '31/10/2026'],
    ['311020261234', '31/10/2026'],
    ['31/10/2026', '31/10/2026'],
    ['3a1-1.0', '31/10'],
  ])('mascara %j como %j', (entrada, esperado) => {
    expect(mascararData(entrada)).toBe(esperado);
  });

  it('permite apagar: remover a barra final não a recoloca', () => {
    expect(mascararData('31/')).toBe('31');
    expect(mascararData('31/1')).toBe('31/1');
  });
});

describe('dataBrParaIso', () => {
  it('converte datas reais para ISO', () => {
    expect(dataBrParaIso('31/10/2026')).toBe('2026-10-31');
    expect(dataBrParaIso(' 29/02/2028 ')).toBe('2028-02-29');
  });

  it.each(['', '31/10', '2026-10-31', '30/02/2026', '29/02/2027', '32/01/2026', '01/13/2026', '1/1/2026'])(
    'rejeita %j',
    (texto) => {
      expect(dataBrParaIso(texto)).toBeNull();
    }
  );
});

describe('dataBrValida', () => {
  it('aceita vazio (opcional) e data real; rejeita o resto', () => {
    expect(dataBrValida('')).toBe(true);
    expect(dataBrValida('  ')).toBe(true);
    expect(dataBrValida('31/10/2026')).toBe(true);
    expect(dataBrValida('31/10')).toBe(false);
    expect(dataBrValida('30/02/2026')).toBe(false);
  });
});

describe('lerInstante', () => {
  it('respeita o offset da API', () => {
    expect(lerInstante('2026-10-31T10:00:00-03:00')).toBe(Date.parse('2026-10-31T13:00:00Z'));
    expect(lerInstante('2026-10-31T13:00:00Z')).toBe(Date.parse('2026-10-31T13:00:00Z'));
  });

  it('sem fuso assume -03:00 e inválido vira NaN', () => {
    expect(lerInstante('2026-10-31T10:00:00')).toBe(Date.parse('2026-10-31T13:00:00Z'));
    expect(Number.isNaN(lerInstante('lixo'))).toBe(true);
  });
});
