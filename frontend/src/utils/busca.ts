/** Minúsculas, sem acentos e sem espaços nas pontas (para comparar textos). */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Filtra por nome, ignorando acentos e caixa. Busca vazia devolve tudo. */
export function filtrarPorNome<T extends { nome: string }>(
  itens: T[],
  busca: string
): T[] {
  return filtrarPorCampos(itens, busca, (item) => [item.nome]);
}

/** Filtra por qualquer um dos textos devolvidos por `campos` (sem acentos/caixa). */
export function filtrarPorCampos<T>(
  itens: T[],
  busca: string,
  campos: (item: T) => (string | null | undefined)[]
): T[] {
  const termo = normalizar(busca);

  if (!termo) {
    return itens;
  }

  return itens.filter((item) =>
    campos(item).some((campo) => normalizar(campo ?? '').includes(termo))
  );
}
