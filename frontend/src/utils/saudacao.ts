const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "Bom dia", "Boa tarde" ou "Boa noite" conforme a hora (0–23). */
export function saudacao(hora: number): string {
  if (hora >= 5 && hora < 12) {
    return 'Bom dia';
  }

  return hora >= 12 && hora < 18 ? 'Boa tarde' : 'Boa noite';
}

/** Rótulo de cabeçalho: "SEXTA, 31 OUT". */
export function rotuloData(data: Date = new Date()): string {
  return `${DIAS[data.getDay()]}, ${data.getDate()} ${MESES[data.getMonth()]}`.toUpperCase();
}

/** Primeiro nome ("Maria da Silva" -> "Maria"); vazio se não houver nome. */
export function primeiroNome(nome?: string | null): string {
  return (nome ?? '').trim().split(/\s+/)[0] ?? '';
}
