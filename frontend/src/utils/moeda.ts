/**
 * Dinheiro como string decimal ("1234.50"), sem passar por float.
 * A API serializa valores assim (Contrato-Gestao.md, regras gerais).
 */

const DECIMAL = /^(-)?(\d+)(?:\.(\d+))?$/;

function agruparMilhares(inteiro: string): string {
  return inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** "1234.5" -> "R$ 1.234,50". Vazio ou inválido -> "—". */
export function formatarMoeda(valor: string | null | undefined): string {
  if (valor === null || valor === undefined) return '—';

  const partes = DECIMAL.exec(valor.trim());

  if (!partes) return '—';

  const [, sinal, inteiro, fracao = ''] = partes;
  const centavos = fracao.padEnd(2, '0').slice(0, 2);
  const inteiroSemZeros = inteiro.replace(/^0+(?=\d)/, '');
  const negativo = sinal && (Number(inteiroSemZeros) !== 0 || /[1-9]/.test(centavos));

  return `${negativo ? '-' : ''}R$ ${agruparMilhares(inteiroSemZeros)},${centavos}`;
}

/**
 * Converte o texto digitado ("1.234,50", "R$ 10", "12,5") em string decimal
 * com 2 casas ("1234.50"). Devolve `null` para vazio, negativo ou inválido
 * (mais de 2 casas decimais, letras, separadores fora de lugar).
 */
export function converterEntradaParaDecimal(entrada: string): string | null {
  const texto = entrada.replace(/R\$/gi, '').replace(/\s/g, '');

  if (!texto) return null;

  let inteiro: string;
  let fracao = '';

  if (texto.includes(',')) {
    const [parteInteira, parteFracao, ...resto] = texto.split(',');

    if (resto.length > 0) return null;

    inteiro = parteInteira;
    fracao = parteFracao;

    if (!/^\d{1,3}(\.\d{3})+$|^\d+$/.test(inteiro)) return null;

    inteiro = inteiro.replace(/\./g, '');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(texto)) {
    inteiro = texto.replace(/\./g, '');
  } else if (/^\d+(\.\d{1,2})?$/.test(texto)) {
    [inteiro, fracao = ''] = texto.split('.');
  } else {
    return null;
  }

  const virgulaSemCentavos = texto.includes(',') && fracao === '';

  if (virgulaSemCentavos || !/^\d*$/.test(fracao) || fracao.length > 2 || inteiro === '') {
    return null;
  }

  return `${inteiro.replace(/^0+(?=\d)/, '')}.${fracao.padEnd(2, '0')}`;
}
