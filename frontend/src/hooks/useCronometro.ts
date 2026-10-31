import { useCallback, useEffect, useRef, useState } from 'react';
import { Vibration } from 'react-native';

import {
  adicionarSegundos,
  ativo,
  CRONOMETRO_PARADO,
  EstadoCronometro,
  iniciarCronometro,
  pausado,
  pausarCronometro,
  restanteSegundos,
  retomarCronometro,
  terminou,
} from '@/utils/cronometro';

const INTERVALO_MS = 250;
const PADRAO_VIBRACAO = [0, 500, 200, 500];

/**
 * Cronômetro regressivo. O tempo vem do timestamp de fim (Date.now), então
 * não atrasa se o app ficar em segundo plano; o intervalo só redesenha.
 */
export function useCronometro() {
  const [estado, setEstado] = useState<EstadoCronometro>(CRONOMETRO_PARADO);
  const [agora, setAgora] = useState(() => Date.now());
  const estadoRef = useRef(estado);

  useEffect(() => {
    estadoRef.current = estado;
  }, [estado]);

  const rodando = estado.fimEm !== null;

  useEffect(() => {
    if (!rodando) {
      return;
    }

    const id = setInterval(() => {
      const instante = Date.now();

      if (terminou(estadoRef.current, instante)) {
        Vibration.vibrate(PADRAO_VIBRACAO);
        setEstado(CRONOMETRO_PARADO);
        return;
      }

      setAgora(instante);
    }, INTERVALO_MS);

    return () => clearInterval(id);
  }, [rodando]);

  const iniciar = useCallback((segundos: number) => {
    const instante = Date.now();
    setAgora(instante);
    setEstado(iniciarCronometro(segundos, instante));
  }, []);

  const pausar = useCallback(
    () => setEstado((e) => pausarCronometro(e, Date.now())),
    []
  );

  const retomar = useCallback(() => {
    const instante = Date.now();
    setAgora(instante);
    setEstado((e) => retomarCronometro(e, instante));
  }, []);

  const adicionar = useCallback(
    (segundos: number) => setEstado((e) => adicionarSegundos(e, segundos)),
    []
  );

  const pular = useCallback(() => setEstado(CRONOMETRO_PARADO), []);

  return {
    ativo: ativo(estado),
    pausado: pausado(estado),
    restante: restanteSegundos(estado, agora),
    iniciar,
    pausar,
    retomar,
    adicionar,
    pular,
  };
}
