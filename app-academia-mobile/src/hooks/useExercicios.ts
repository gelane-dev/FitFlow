import axios from 'axios';
import { useEffect, useState } from 'react';

import { buscarExercicios } from '@/services/exercicio.service';
import { ErroApi } from '@/types/api.types';
import { Exercicio } from '@/types/exercicio.types';

export function useExercicios() {
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarExercicios() {
      try {
        setCarregando(true);
        setErro(null);

        const dados = await buscarExercicios();

        setExercicios(dados);
      } catch (erro) {
        if (axios.isAxiosError<ErroApi>(erro)) {
          setErro(
            erro.response?.data?.detail ||
              'Erro ao carregar exercícios.'
          );

          return;
        }

        setErro('Ocorreu um erro inesperado.');
      } finally {
        setCarregando(false);
      }
    }

    carregarExercicios();
  }, []);

  return {
    exercicios,
    carregando,
    erro,
  };
}