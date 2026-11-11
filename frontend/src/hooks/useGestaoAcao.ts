import { useCallback, useState } from 'react';

import { mensagemErro } from '@/utils/erroApi';

export type ResultadoAcao<R> = { ok: true; valor: R } | { ok: false; erro: string };

/**
 * Executa uma operação de escrita (criar, editar, desativar, publicar...) com `processando` e o erro
 * da API já como mensagem; quem chama decide o que mostrar (`mostrarAlerta`, diálogo) e o que recarregar.
 * É o único hook de ação das áreas de gestão (admin, recepção e professor).
 */
export function useGestaoAcao() {
  const [processando, setProcessando] = useState(false);

  const executar = useCallback(async <R,>(operacao: () => Promise<R>, padraoErro: string): Promise<ResultadoAcao<R>> => {
    setProcessando(true);

    try {
      return { ok: true, valor: await operacao() };
    } catch (e) {
      return { ok: false, erro: mensagemErro(e, padraoErro) };
    } finally {
      setProcessando(false);
    }
  }, []);

  return { processando, executar };
}
