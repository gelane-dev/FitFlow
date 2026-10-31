import { useCallback, useEffect, useRef } from 'react';

import { useFocusEffect } from 'expo-router';

/**
 * Chama `recarregar` quando a tela volta ao foco (ADR-030). Ignora o primeiro
 * foco, porque o hook de dados já carrega na montagem, e não depende da
 * identidade de `recarregar` (mudar de página não dispara recarga extra).
 */
export function useRecarregarNoFoco(recarregar: () => unknown) {
  const funcao = useRef(recarregar);
  const primeiroFoco = useRef(true);

  useEffect(() => {
    funcao.current = recarregar;
  }, [recarregar]);

  useFocusEffect(
    useCallback(() => {
      if (primeiroFoco.current) {
        primeiroFoco.current = false;

        return;
      }

      funcao.current();
    }, [])
  );
}
