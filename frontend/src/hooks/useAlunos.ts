import axios from 'axios';
import { useEffect, useState } from 'react';

import { buscarAlunos } from '@/services/aluno.service';
import { ErroApi } from '@/types/api.types';
import { AlunoLista } from '@/types/ficha.types';

export function useAlunos() {
  const [alunos, setAlunos] = useState<AlunoLista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarAlunos() {
      try {
        setCarregando(true);
        setErro(null);

        const dados = await buscarAlunos();

        setAlunos(dados);
      } catch (erro) {
        if (axios.isAxiosError<ErroApi>(erro)) {
          setErro(
            erro.response?.data?.detail ||
              'Erro ao carregar alunos.'
          );

          return;
        }

        setErro('Ocorreu um erro inesperado.');
      } finally {
        setCarregando(false);
      }
    }

    carregarAlunos();
  }, []);

  return {
    alunos,
    carregando,
    erro,
  };
}
