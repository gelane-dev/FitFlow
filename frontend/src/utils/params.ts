/** Primeiro valor de um parâmetro de rota (`string | string[]`). */
export function paramTexto(valor: string | string[] | undefined): string {
  return Array.isArray(valor) ? valor[0] ?? '' : valor ?? '';
}
