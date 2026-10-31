/** Espaço que não quebra linha: mantém número e unidade juntos ("12 kg"). */
export const ESPACO_FIXO = '\u00A0';

/** A palavra no número certo: plural(1, 'dia') = "dia"; plural(2, 'dia') = "dias". */
export function plural(quantidade: number, singular: string, pluralIrregular?: string): string {
  return quantidade === 1 ? singular : (pluralIrregular ?? `${singular}s`);
}

/** "1 dia", "2 dias", "0 dias". O plural padrão é o singular + "s". */
export function pluralizar(quantidade: number, singular: string, pluralIrregular?: string): string {
  return `${quantidade}${ESPACO_FIXO}${plural(quantidade, singular, pluralIrregular)}`;
}

/** Valor com a unidade presa a ele: "12,5 kg". */
export function comUnidade(valor: string | number, unidade: string): string {
  return `${valor}${ESPACO_FIXO}${unidade}`;
}

/** "3 exercícios · ~16 min" (a duração some quando 0; "1 exercício" no singular). */
export function descreverTreino(exercicios: number, duracaoMin: number): string {
  const base = pluralizar(exercicios, 'exercício');

  return duracaoMin > 0 ? `${base} · ~${comUnidade(duracaoMin, 'min')}` : base;
}

/** "terça" → "Terça". */
export function inicialMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
