/** Estado do cronômetro baseado em timestamp de fim (não soma ticks). */
export interface EstadoCronometro {
  /** Timestamp (ms) em que termina; null se parado ou pausado. */
  fimEm: number | null;
  /** Milissegundos restantes quando pausado; null se rodando ou parado. */
  restantePausadoMs: number | null;
}

export const CRONOMETRO_PARADO: EstadoCronometro = {
  fimEm: null,
  restantePausadoMs: null,
};

export function iniciarCronometro(
  segundos: number,
  agora: number
): EstadoCronometro {
  return {
    fimEm: agora + Math.max(0, segundos) * 1000,
    restantePausadoMs: null,
  };
}

export function ativo(estado: EstadoCronometro): boolean {
  return estado.fimEm !== null || estado.restantePausadoMs !== null;
}

export function pausado(estado: EstadoCronometro): boolean {
  return estado.restantePausadoMs !== null;
}

export function restanteMs(estado: EstadoCronometro, agora: number): number {
  if (estado.restantePausadoMs !== null) {
    return Math.max(0, estado.restantePausadoMs);
  }

  if (estado.fimEm !== null) {
    return Math.max(0, estado.fimEm - agora);
  }

  return 0;
}

/** Segundos restantes arredondados para cima (0:00 só quando acabou). */
export function restanteSegundos(
  estado: EstadoCronometro,
  agora: number
): number {
  return Math.ceil(restanteMs(estado, agora) / 1000);
}

export function pausarCronometro(
  estado: EstadoCronometro,
  agora: number
): EstadoCronometro {
  if (estado.fimEm === null) {
    return estado;
  }

  return { fimEm: null, restantePausadoMs: Math.max(0, estado.fimEm - agora) };
}

export function retomarCronometro(
  estado: EstadoCronometro,
  agora: number
): EstadoCronometro {
  if (estado.restantePausadoMs === null) {
    return estado;
  }

  return { fimEm: agora + estado.restantePausadoMs, restantePausadoMs: null };
}

export function adicionarSegundos(
  estado: EstadoCronometro,
  segundos: number
): EstadoCronometro {
  if (estado.restantePausadoMs !== null) {
    return {
      ...estado,
      restantePausadoMs: estado.restantePausadoMs + segundos * 1000,
    };
  }

  if (estado.fimEm !== null) {
    return { ...estado, fimEm: estado.fimEm + segundos * 1000 };
  }

  return estado;
}

export function terminou(estado: EstadoCronometro, agora: number): boolean {
  return estado.fimEm !== null && agora >= estado.fimEm;
}

/** 75 → "1:15". */
export function formatarTempo(totalSegundos: number): string {
  const total = Math.max(0, Math.floor(totalSegundos));
  const minutos = Math.floor(total / 60);
  const segundos = total % 60;

  return `${minutos}:${String(segundos).padStart(2, '0')}`;
}
