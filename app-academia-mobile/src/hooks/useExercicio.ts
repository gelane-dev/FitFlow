import axios from 'axios';
import { useEffect, useState } from 'react';

import { buscarExercicio } from '@/services/exercicio.service';
import { ErroApi } from '@/types/api.types';
import { Exercicio } from '@/types/exercicio.types';

export function useExercicio(id: number) {
  const [exercicio, setExercicio] = useState<Exercicio | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarExercicio() {
      try {
        setCarregando(true);
        setErro(null);

        const dados = await buscarExercicio(id);

        setExercicio(dados);
      } catch (erro) {
        if (axios.isAxiosError<ErroApi>(erro)) {
          setErro(
            erro.response?.data?.detail ||
              'Erro ao carregar exercício.'
          );

          return;
        }

        setErro('Ocorreu um erro inesperado.');
      } finally {
        setCarregando(false);
      }
    }

    carregarExercicio();
  }, [id]);

  return {
    exercicio,
    carregando,
    erro,
  };
}