import { useCallback, useEffect, useState } from 'react';

import { listarAvaliacoesAluno } from '@/services/avaliacao.service';
import { AvaliacaoResposta } from '@/types/avaliacao.types';
import { mensagemErro } from '@/utils/erroApi';

export function useAvaliacoesAluno(alunoId: number) {
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoResposta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);

      setAvaliacoes(await listarAvaliacoesAluno(alunoId));
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao carregar avaliações.'));
    } finally {
      setCarregando(false);
    }
  }, [alunoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { avaliacoes, carregando, erro, recarregar: carregar };
}
