import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

import { buscarTreinos } from '@/services/treino.service';
import { ErroApi } from '@/types/api.types';
import { Treino } from '@/types/ficha.types';

export function useTreinos(fichaId: number) {
  const [treinos, setTreinos] = useState<Treino[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarTreinos = useCallback(async () => {
    if (!fichaId) {
      setCarregando(false);

      return;
    }

    try {
      setCarregando(true);
      setErro(null);

      const dados = await buscarTreinos(fichaId);

      setTreinos(dados);
    } catch (erro) {
      if (axios.isAxiosError<ErroApi>(erro)) {
        setErro(
          erro.response?.data?.detail ||
            'Erro ao carregar treinos.'
        );

        return;
      }

      setErro('Ocorreu um erro inesperado.');
    } finally {
      setCarregando(false);
    }
  }, [fichaId]);

  useEffect(() => {
    carregarTreinos();
  }, [carregarTreinos]);

  return {
    treinos,
    carregando,
    erro,
    recarregar: carregarTreinos,
  };
}
