import { formatarAltura, formatarDecimal, formatarNumeroBr } from '@/utils/numeros';
import { formatarNumero } from '@/utils/evolucao';
import { formatarImc } from '@/utils/vigencia';

describe('formatação numérica pt-BR', () => {
  it('altura sempre com 2 casas e vírgula', () => {
    expect(formatarAltura(1.7)).toBe('1,70 m');
    expect(formatarAltura(1.68)).toBe('1,68 m');
    expect(formatarAltura(2)).toBe('2,00 m');
  });

  it('decimal fixo e número livre', () => {
    expect(formatarDecimal(22.857, 2)).toBe('22,86');
    expect(formatarNumeroBr(70)).toBe('70');
    expect(formatarNumeroBr(71.5)).toBe('71,5');
    expect(formatarNumeroBr(71.25)).toBe('71,25');
  });

  it('cargas e IMC usam vírgula', () => {
    expect(formatarNumero(128.5)).toBe('128,5');
    expect(formatarNumero(20)).toBe('20');
    expect(formatarImc(22.857)).toBe('22,86');
  });
});
