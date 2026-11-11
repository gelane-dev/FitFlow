import { converterEntradaParaDecimal, formatarMoeda } from './moeda';

/**
 * Máscara do campo de moeda (reais): o valor do campo guarda só o texto mascarado.
 * Formatação e conversão decimal ficam em `utils/moeda.ts`; aqui só a digitação em centavos.
 */

/** Só dígitos viram centavos: "123456" → "1.234,56"; vazio → "". */
export function mascararMoeda(texto: string): string {
  const digitos = texto.replace(/\D/g, '').replace(/^0+(?=\d)/, '');

  if (!digitos) {
    return '';
  }

  const centavos = digitos.padStart(3, '0');
  const inteiro = centavos.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${inteiro},${centavos.slice(-2)}`;
}

/** "1.234,56" → "1234.56" (decimal como string, como a API espera); vazio → null. */
export function moedaParaDecimal(texto: string): string | null {
  const mascarado = mascararMoeda(texto);

  return mascarado ? converterEntradaParaDecimal(mascarado) : null;
}

/**
 * "1234.56" (ou o número 1234.56) → "1.234,56" para preencher o campo ao editar.
 * Trabalha sobre o texto decimal (via `formatarMoeda`), sem multiplicar por 100 em float.
 */
export function decimalParaCampo(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') {
    return '';
  }

  const decimal = typeof valor === 'number' ? (Number.isFinite(valor) ? valor.toFixed(2) : '') : valor;
  const formatado = formatarMoeda(decimal.replace(/^-/, ''));

  return formatado === '—' ? '' : formatado.replace('R$ ', '');
}
