import { useEffect } from 'react';
import { mostrarAlerta } from '@/utils/alerta';

/** Exibe um Alert sempre que `erro` receber uma mensagem. */
export function useAlertaErro(erro: string | null | undefined) {
  useEffect(() => {
    if (erro) {
      mostrarAlerta('Erro', erro);
    }
  }, [erro]);
}
