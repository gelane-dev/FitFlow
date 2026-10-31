/** Formatação numérica pt-BR (vírgula decimal) para exibição. Funções puras. */

/** Número com `casas` decimais fixas e vírgula: (1.7, 2) → "1,70". */
export function formatarDecimal(valor: number, casas: number): string {
  return valor.toFixed(casas).replace('.', ',');
}

/** Até `maximo` casas, sem zeros sobrando: 70 → "70"; 71.5 → "71,5"; 71.25 → "71,25". */
export function formatarNumeroBr(valor: number, maximo = 2): string {
  return String(Number(valor.toFixed(maximo))).replace('.', ',');
}

/** Altura em metros com 2 casas: 1.7 → "1,70 m". */
export function formatarAltura(altura: number): string {
  return `${formatarDecimal(altura, 2)} m`;
}
