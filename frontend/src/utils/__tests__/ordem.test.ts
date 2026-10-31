import { montarTroca, ordenarPorOrdem } from '@/utils/ordem';

const itens = [
  { id: 10, ordem: 1 },
  { id: 20, ordem: 2 },
  { id: 30, ordem: 5 },
];

describe('montarTroca', () => {
  it('↓ troca as ordens do item com o seguinte', () => {
    expect(montarTroca(itens, 0, 1)).toEqual([
      { id: 10, ordem: 2 },
      { id: 20, ordem: 1 },
    ]);
  });

  it('↑ troca as ordens do item com o anterior (ordens não consecutivas)', () => {
    expect(montarTroca(itens, 2, -1)).toEqual([
      { id: 30, ordem: 2 },
      { id: 20, ordem: 5 },
    ]);
  });

  it('retorna [] nos limites e para índice inexistente', () => {
    expect(montarTroca(itens, 0, -1)).toEqual([]);
    expect(montarTroca(itens, 2, 1)).toEqual([]);
    expect(montarTroca(itens, 9, 1)).toEqual([]);
    expect(montarTroca([], 0, 1)).toEqual([]);
  });
});

describe('ordenarPorOrdem', () => {
  it('ordena crescente sem alterar o original', () => {
    const desordenado = [
      { id: 1, ordem: 3 },
      { id: 2, ordem: 1 },
      { id: 3, ordem: 2 },
    ];

    expect(ordenarPorOrdem(desordenado).map((i) => i.id)).toEqual([2, 3, 1]);
    expect(desordenado.map((i) => i.id)).toEqual([1, 2, 3]);
  });
});
