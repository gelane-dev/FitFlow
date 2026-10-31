import { cores, tipografia } from '@/theme';

function luminancia(hex: string): number {
  const canais = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
}

function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);

  return (claro + 0.05) / (escuro + 0.05);
}

describe('contraste do textoTerciario (S-2)', () => {
  it.each(['fundo', 'superficie', 'superficieElevada'] as const)(
    'tem ao menos 4,5:1 sobre %s',
    (fundo) => {
      expect(contraste(cores.textoTerciario, cores[fundo])).toBeGreaterThanOrEqual(4.5);
    }
  );
});

describe('tipografia.numero (I-01)', () => {
  it('usa a fonte do sistema (sem fontFamily), peso 800 e algarismos tabulares', () => {
    expect(tipografia.numero).toEqual({ fontWeight: '800', fontVariant: ['tabular-nums'] });
    expect(tipografia.numero).not.toHaveProperty('fontFamily');
  });
});
