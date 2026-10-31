import { ReactNode, useCallback, useEffect, useState } from 'react';

import { DialogoAlerta } from '@/components/ui/DialogoAlerta';
import { BotaoAlerta, ItemAlerta, registrarExibidorAlerta } from '@/utils/alerta';

/**
 * Monta o modal de alerta do design system e o liga a `mostrarAlerta`. Alertas simultâneos
 * entram numa fila e aparecem um de cada vez.
 */
export function ProvedorAlerta({ children }: { children: ReactNode }) {
  const [fila, setFila] = useState<ItemAlerta[]>([]);

  useEffect(
    () => registrarExibidorAlerta((item) => setFila((atual) => [...atual, item])),
    []
  );

  const escolher = useCallback((botao: BotaoAlerta) => {
    setFila((atual) => atual.slice(1));
    botao.onPress?.();
  }, []);

  const atual = fila[0];

  return (
    <>
      {children}
      <DialogoAlerta
        visivel={!!atual}
        titulo={atual?.titulo ?? ''}
        mensagem={atual?.mensagem}
        botoes={atual?.botoes}
        aoEscolher={escolher}
      />
    </>
  );
}
