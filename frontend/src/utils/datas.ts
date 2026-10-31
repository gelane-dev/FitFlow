/** "2026-10-30T08:00:00" → "30/10/2026". */
export function formatarData(data: string): string {
  const [ano, mes, dia] = data.slice(0, 10).split('-');

  return ano && mes && dia ? `${dia}/${mes}/${ano}` : data;
}

/**
 * Máscara de digitação DD/MM/AAAA: guarda só os dígitos (até 8) e insere as
 * barras. "3110" → "31/10"; "31102026" → "31/10/2026".
 */
export function mascararData(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 8);

  if (digitos.length <= 2) {
    return digitos;
  }

  if (digitos.length <= 4) {
    return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  }

  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

/** "31/10/2026" → "2026-10-31"; `null` se o formato ou a data (ex.: 30/02) forem inválidos. */
export function dataBrParaIso(texto: string): string | null {
  const encontrado = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());

  if (!encontrado) {
    return null;
  }

  const [, dia, mes, ano] = encontrado;
  const iso = `${ano}-${mes}-${dia}`;
  const data = new Date(`${iso}T00:00:00Z`);

  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === iso ? iso : null;
}

/** Data BR real? Vazio é aceito (campo opcional). */
export function dataBrValida(texto: string): boolean {
  return !texto.trim() || dataBrParaIso(texto) !== null;
}

/** Offset de APP_TIMEZONE assumido para datas sem fuso (a API passou a enviá-lo; ADR-016). */
const OFFSET_PADRAO = '-03:00';

/**
 * Instante (ms) de um datetime da API. A API envia ISO com offset ("2026-10-31T10:00:00-03:00"),
 * então o resultado independe do fuso do aparelho. Sem offset, assume o de Brasília.
 * NaN se inválido.
 */
export function lerInstante(iso: string): number {
  const temFuso = /(Z|[+-]\d{2}:?\d{2})$/i.test(iso) || !iso.includes('T');

  return new Date(temFuso ? iso : `${iso}${OFFSET_PADRAO}`).getTime();
}
