import { useCallback, useState } from 'react';

/**
 * Estado do puxar-para-atualizar: `atualizando` fica ligado só durante o puxão
 * do usuário (recargas automáticas ao voltar à tela não acendem o spinner).
 */
export function usePuxarParaAtualizar(recarregar: () => unknown) {
  const [atualizando, setAtualizando] = useState(false);

  const aoAtualizar = useCallback(async () => {
    setAtualizando(true);

    try {
      await recarregar();
    } finally {
      setAtualizando(false);
    }
  }, [recarregar]);

  return { atualizando, aoAtualizar };
}
