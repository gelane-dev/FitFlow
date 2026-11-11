import { useCallback } from 'react';

import { criarGestaoAluno } from '@/services/gestaoAlunos.service';
import type { GestaoAlunoCriar } from '@/types/gestao.types';

import { useGestaoAcao } from './useGestaoAcao';

/**
 * Cadastro de aluno pela gestão (nasce aprovado). Compartilhado por admin (que pode mandar
 * `professor_id`) e recepção. Devolve o resultado; a tela mostra `erro` no formulário.
 */
export function useGestaoCriarAluno() {
  const { processando, executar } = useGestaoAcao();

  const criar = useCallback(
    (dados: GestaoAlunoCriar) => executar(() => criarGestaoAluno(dados), 'Erro ao cadastrar o aluno.'),
    [executar]
  );

  return { processando, criar };
}
