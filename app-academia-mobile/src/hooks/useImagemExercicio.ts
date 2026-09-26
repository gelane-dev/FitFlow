import axios from 'axios';
import { useState } from 'react';

import { enviarImagemExercicio } from '@/services/exercicio.service';
import { ErroApi } from '@/types/api.types';

interface ImagemExercicio {
  uri: string;
  name: string;
  type: string;
}

export function useImagemExercicio() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviarImagem(
    id: number,
    imagem: ImagemExercicio
  ): Promise<boolean> {
    try {
      setCarregando(true);
      setErro(null);

      await enviarImagemExercicio(id, imagem);

      return true;
    } catch (erro) {
      if (axios.isAxiosError<ErroApi>(erro)) {
        setErro(
          erro.response?.data?.detail ||
            'Erro ao enviar imagem do exercício.'
        );

        return false;
      }

      setErro('Ocorreu um erro inesperado.');

      return false;
    } finally {
      setCarregando(false);
    }
  }

  return {
    enviarImagem,
    carregando,
    erro,
  };
}