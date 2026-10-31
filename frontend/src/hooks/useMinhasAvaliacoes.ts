import { useCallback, useEffect, useState } from 'react';

import { listarMinhasAvaliacoes } from '@/services/avaliacao.service';
import { AvaliacaoResposta } from '@/types/avaliacao.types';
import { mensagemErro } from '@/utils/erroApi';

export function useMinhasAvaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoResposta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);
      setAvaliacoes(await listarMinhasAvaliacoes());
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao carregar avaliações.'));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { avaliacoes, carregando, erro, recarregar };
}
