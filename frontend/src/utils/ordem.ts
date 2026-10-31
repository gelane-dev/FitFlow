export interface OrdemItem {
  id: number;
  ordem: number;
}

/**
 * Lista {id, ordem} resultante de trocar o item `indice` com o vizinho na
 * direção indicada (↑ = -1, ↓ = 1). Só os dois itens trocados são enviados;
 * o backend aplica tudo de forma atômica. Retorna [] se a troca for impossível.
 */
export function montarTroca(
  itens: OrdemItem[],
  indice: number,
  direcao: -1 | 1
): OrdemItem[] {
  const atual = itens[indice];
  const vizinho = itens[indice + direcao];

  if (!atual || !vizinho) {
    return [];
  }

  return [
    { id: atual.id, ordem: vizinho.ordem },
    { id: vizinho.id, ordem: atual.ordem },
  ];
}

/** Ordena por `ordem` crescente sem alterar o array original. */
export function ordenarPorOrdem<T extends OrdemItem>(itens: T[]): T[] {
  return [...itens].sort((a, b) => a.ordem - b.ordem);
}
