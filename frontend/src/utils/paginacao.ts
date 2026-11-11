/** Cálculo da paginação (páginas de 1 a N). Funções puras. */

export interface EstadoPaginacao {
  pagina: number;
  totalPaginas: number;
  /** Posição (1-based) do primeiro item da página; 0 quando não há itens. */
  inicio: number;
  /** Posição (1-based) do último item da página; 0 quando não há itens. */
  fim: number;
  temAnterior: boolean;
  temProxima: boolean;
}

export function calcularPaginacao(total: number, tamanhoPagina: number, pagina: number): EstadoPaginacao {
  const tamanho = Math.max(1, Math.floor(tamanhoPagina));
  const itens = Math.max(0, Math.floor(total));
  const totalPaginas = Math.max(1, Math.ceil(itens / tamanho));
  const atual = Math.min(Math.max(1, Math.floor(pagina) || 1), totalPaginas);
  const inicio = itens === 0 ? 0 : (atual - 1) * tamanho + 1;
  const fim = itens === 0 ? 0 : Math.min(atual * tamanho, itens);

  return {
    pagina: atual,
    totalPaginas,
    inicio,
    fim,
    temAnterior: atual > 1,
    temProxima: atual < totalPaginas,
  };
}
