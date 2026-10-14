import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

import { buscarFicha } from '@/services/ficha.service';
import { ErroApi } from '@/types/api.types';
import { FichaLista } from '@/types/ficha.types';

export function useFicha(id: number) {
  const [ficha, setFicha] = useState<FichaLista | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarFicha = useCallback(async () => {
    if (!id) {
      setCarregando(false);
      setErro('Ficha inválida.');

      return;
    }

    try {
      setCarregando(true);
      setErro(null);

      const dados = await buscarFicha(id);

      setFicha(dados);
    } catch (erro) {
      if (axios.isAxiosError<ErroApi>(erro)) {
        setErro(
          erro.response?.data?.detail ||
            'Erro ao carregar ficha.'
        );

        return;
      }

      setErro('Ocorreu um erro inesperado.');
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    carregarFicha();
  }, [carregarFicha]);

  return {
    ficha,
    carregando,
    erro,
    recarregar: carregarFicha,
  };
}
