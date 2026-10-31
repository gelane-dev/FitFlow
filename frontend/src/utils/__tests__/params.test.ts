import { paramTexto } from '@/utils/params';

describe('paramTexto', () => {
  it('string, array (primeiro) e ausente', () => {
    expect(paramTexto('7')).toBe('7');
    expect(paramTexto(['7', '8'])).toBe('7');
    expect(paramTexto([])).toBe('');
    expect(paramTexto(undefined)).toBe('');
  });
});
