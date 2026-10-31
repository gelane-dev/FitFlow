import { ComponentProps } from 'react';

import { Botao } from '@/components/ui/Botao';

/**
 * Compatibilidade: as telas ainda não redesenhadas usam `Button`.
 * Novo código deve usar `Botao` de `@/components/ui` (ADR-031).
 */
export function Button(props: ComponentProps<typeof Botao>) {
  return <Botao {...props} />;
}
