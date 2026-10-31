import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

import { buscarFichas } from '@/services/ficha.service';
import { ErroApi } from '@/types/api.types';
import { FichaLista } from '@/types/ficha.types';

export function useFichas() {
  const [fichas, setFichas] = useState<FichaLista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarFichas = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);

      const dados = await buscarFichas();

      setFichas(dados);
    } catch (erro) {
      if (axios.isAxiosError<ErroApi>(erro)) {
        setErro(
          erro.response?.data?.detail ||
            'Erro ao carregar fichas.'
        );

        return;
      }

      setErro('Ocorreu um erro inesperado.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarFichas();
  }, [carregarFichas]);

  return {
    fichas,
    carregando,
    erro,
    recarregar: carregarFichas,
  };
}
