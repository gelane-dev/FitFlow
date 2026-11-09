import {
  calcularVariacao,
  formatarDiferenca,
  formatarPercentual,
  setaDaVariacao,
  tomDaVariacao,
} from '@/utils/variacaoEvolucao';

describe('calcularVariacao', () => {
  it('sem anterior não há variação (primeiro registro)', () => {
    expect(calcularVariacao(40, null)).toBeNull();
    expect(calcularVariacao(40, undefined)).toBeNull();
  });

  it('diferença absoluta e percentual sobre o anterior', () => {
    expect(calcularVariacao(45, 40)).toEqual({ absoluta: 5, percentual: 12.5, sentido: 'subiu' });
    expect(calcularVariacao(36, 40)).toEqual({ absoluta: -4, percentual: -10, sentido: 'caiu' });
  });

  it('anterior 0: percentual é null, a absoluta continua', () => {
    expect(calcularVariacao(10, 0)).toEqual({ absoluta: 10, percentual: null, sentido: 'subiu' });
  });

  it('valores iguais: sentido igual', () => {
    expect(calcularVariacao(40, 40)).toEqual({ absoluta: 0, percentual: 0, sentido: 'igual' });
  });

  it('não vaza ruído de ponto flutuante', () => {
    expect(calcularVariacao(72.5, 71.2)!.absoluta).toBe(1.3);
  });
});

describe('tomDaVariacao', () => {
  const subiu = calcularVariacao(45, 40);
  const caiu = calcularVariacao(35, 40);

  it('direção "alta": subir é favorável, cair é desfavorável', () => {
    expect(tomDaVariacao(subiu, 'alta')).toBe('favoravel');
    expect(tomDaVariacao(caiu, 'alta')).toBe('desfavoravel');
  });

  it('direção "queda": cair é favorável (gordura)', () => {
    expect(tomDaVariacao(caiu, 'queda')).toBe('favoravel');
    expect(tomDaVariacao(subiu, 'queda')).toBe('desfavoravel');
  });

  it('direção neutra, sem variação ou igual: neutro', () => {
    expect(tomDaVariacao(subiu, 'neutra')).toBe('neutro');
    expect(tomDaVariacao(null, 'alta')).toBe('neutro');
    expect(tomDaVariacao(calcularVariacao(40, 40), 'alta')).toBe('neutro');
  });
});

describe('formatação', () => {
  it('diferença sempre com sinal e vírgula decimal', () => {
    expect(formatarDiferenca(2.5, 'kg')).toBe('+2,5 kg');
    expect(formatarDiferenca(-1, 'kg')).toBe('−1 kg');
    expect(formatarDiferenca(0, 'kg')).toBe('0 kg');
    expect(formatarDiferenca(0.4)).toBe('+0,4');
  });

  it('percentual com sinal; null vira traço', () => {
    expect(formatarPercentual(12.5)).toBe('+12,5%');
    expect(formatarPercentual(-3)).toBe('−3%');
    expect(formatarPercentual(null)).toBe('—');
  });

  it('seta acompanha o sentido (a cor nunca fala sozinha)', () => {
    expect(setaDaVariacao(calcularVariacao(5, 4)!)).toBe('↑');
    expect(setaDaVariacao(calcularVariacao(3, 4)!)).toBe('↓');
    expect(setaDaVariacao(calcularVariacao(4, 4)!)).toBe('=');
  });
});
