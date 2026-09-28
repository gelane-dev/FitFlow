import axios from 'axios';
import { useState } from 'react';

import { enviarVideoExercicio } from '@/services/exercicio.service';
import { ErroApi } from '@/types/api.types';

interface VideoExercicio {
  uri: string;
  name: string;
  type: string;
}

export function useVideoExercicio() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviarVideo(
    id: number,
    video: VideoExercicio
  ): Promise<boolean> {
    try {
      setCarregando(true);
      setErro(null);

      await enviarVideoExercicio(id, video);

      return true;
    } catch (erro) {
      if (axios.isAxiosError<ErroApi>(erro)) {
        setErro(
          erro.response?.data?.detail ||
            'Erro ao enviar vídeo do exercício.'
        );

        return false;
      }

      setErro(
        'Ocorreu um erro inesperado.'
      );

      return false;
    } finally {
      setCarregando(false);
    }
  }

  return {
    enviarVideo,
    carregando,
    erro,
  };
}