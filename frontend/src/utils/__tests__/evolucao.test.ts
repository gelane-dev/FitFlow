import { PontoEvolucao } from '@/types/evolucao.types';
import {
  formatarData,
  formatarDataCurta,
  formatarHora,
  formatarNumero,
  larguraColuna,
  montarBarras,
} from '@/utils/evolucao';

const pontos: PontoEvolucao[] = [
  { data: '2026-10-01', carga_maxima: 20, volume: 600, registros: 3 },
  { data: '2026-10-08', carga_maxima: 40, volume: 1200, registros: 3 },
  { data: '2026-10-15', carga_maxima: 30, volume: 300, registros: 1 },
];

describe('montarBarras', () => {
  it('proporção relativa ao maior valor da métrica', () => {
    expect(montarBarras(pontos, 'carga_maxima').map((b) => b.proporcao)).toEqual([
      0.5, 1, 0.75,
    ]);
    expect(montarBarras(pontos, 'volume').map((b) => b.valor)).toEqual([
      600, 1200, 300,
    ]);
  });

  it('série toda zerada não divide por zero', () => {
    const zerados = pontos.map((p) => ({ ...p, carga_maxima: 0 }));

    expect(
      montarBarras(zerados, 'carga_maxima').every((b) => b.proporcao === 0)
    ).toBe(true);
    expect(montarBarras([], 'volume')).toEqual([]);
  });
});

describe('formatadores', () => {
  it('data curta, hora e número', () => {
    expect(formatarDataCurta('2026-10-30')).toBe('30/10');
    expect(formatarDataCurta('2026-10-30T08:05:00')).toBe('30/10');
    expect(formatarDataCurta('x')).toBe('x');
    expect(formatarHora('2026-10-30T08:05:00')).toBe('08:05');
    expect(formatarHora('2026-10-30')).toBe('');
    expect(formatarNumero(40)).toBe('40');
    expect(formatarNumero(32.54)).toBe('32,5');
  });

  it('reexporta formatarData de datas', () => {
    expect(formatarData('2026-10-30')).toBe('30/10/2026');
  });
});

describe('larguraColuna (gráfico na largura total)', () => {
  it('divide a largura da área entre as barras', () => {
    expect(larguraColuna(300, 3)).toBe(100);
    expect(larguraColuna(301, 2)).toBe(150);
  });

  it('nunca fica abaixo da mínima (aí a área rola)', () => {
    expect(larguraColuna(300, 12)).toBe(48);
    expect(larguraColuna(300, 12, 30)).toBe(30);
  });

  it('antes de medir (largura 0) ou sem barras, usa a mínima', () => {
    expect(larguraColuna(0, 5)).toBe(48);
    expect(larguraColuna(300, 0)).toBe(48);
  });
});
