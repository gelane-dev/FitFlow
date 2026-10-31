import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

import { buscarItensTreino } from '@/services/ficha.service';
import { ErroApi } from '@/types/api.types';
import { ItemFicha } from '@/types/ficha.types';

export function useItensTreino(treinoId: number) {
  const [itens, setItens] = useState<ItemFicha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarItens = useCallback(async () => {
    if (!treinoId) {
      setCarregando(false);

      return;
    }

    try {
      setCarregando(true);
      setErro(null);

      const dados = await buscarItensTreino(treinoId);

      setItens(dados);
    } catch (erro) {
      if (axios.isAxiosError<ErroApi>(erro)) {
        setErro(
          erro.response?.data?.detail ||
            'Erro ao carregar exercícios do treino.'
        );

        return;
      }

      setErro('Ocorreu um erro inesperado.');
    } finally {
      setCarregando(false);
    }
  }, [treinoId]);

  useEffect(() => {
    carregarItens();
  }, [carregarItens]);

  return {
    itens,
    carregando,
    erro,
    recarregar: carregarItens,
  };
}
