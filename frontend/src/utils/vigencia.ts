import { formatarData } from '@/utils/datas';

/** "30/10/2026 → 30/11/2026", "desde 30/10/2026" ou "" sem datas. */
export function descreverVigencia(
  dataInicio: string | null,
  dataFim: string | null
): string {
  if (dataInicio && dataFim) {
    return `${formatarData(dataInicio)} → ${formatarData(dataFim)}`;
  }

  if (dataInicio) {
    return `Desde ${formatarData(dataInicio)}`;
  }

  return '';
}

/** Valida "AAAA-MM-DD" (data real). Vazio é aceito (campo opcional). */
export function dataValida(texto: string): boolean {
  if (!texto.trim()) {
    return true;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return false;
  }

  const data = new Date(`${texto}T00:00:00Z`);

  return (
    !Number.isNaN(data.getTime()) &&
    data.toISOString().slice(0, 10) === texto
  );
}

/** Converte "12,5" ou "12.5" em número; NaN se vazio/inválido. */
export function lerNumero(texto: string): number {
  const limpo = texto.trim().replace(',', '.');

  return limpo === '' ? NaN : Number(limpo);
}

/** IMC com 2 casas, "—" se faltar dado. */
export function formatarImc(imc: number | null | undefined): string {
  return typeof imc === 'number' ? imc.toFixed(2).replace('.', ',') : '—';
}
