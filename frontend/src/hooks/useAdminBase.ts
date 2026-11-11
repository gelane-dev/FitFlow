import { useCallback } from 'react';

import { useGestaoAcao } from './useGestaoAcao';
import { useGestaoConsulta } from './useGestaoConsulta';

export type { ResultadoAcao } from './useGestaoAcao';

export interface RecursoAdmin<T> {
  dados: T | null;
  /** `true` enquanto uma busca está em andamento (inclusive recargas; use `dados` para saber se já há conteúdo). */
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
}

/**
 * Busca um recurso da API (atalho de `useGestaoConsulta` com `chave` em texto). Refaz a busca quando
 * `chave` muda e descarta respostas atrasadas. Mantém `dados` durante recargas. `ativo=false` adia a busca.
 */
export function useAdminRecurso<T>(
  buscar: () => Promise<T>,
  chave: string,
  padraoErro: string,
  ativo = true
): RecursoAdmin<T> {
  const consulta = useGestaoConsulta<T>(ativo ? buscar : null, padraoErro, [chave, ativo]);
  const { recarregar } = consulta;

  return { ...consulta, recarregar: useCallback(() => recarregar(), [recarregar]) };
}

/** Mesmo hook de ação das demais áreas (`useGestaoAcao`). */
export const useAdminAcao = useGestaoAcao;
