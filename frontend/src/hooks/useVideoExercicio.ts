import axios from 'axios';
import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

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

  async function selecionarVideo(
    id: number,
    aoAtualizar?: () => Promise<void> | void
  ): Promise<boolean> {
    const resultado =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

    if (resultado.canceled) {
      return false;
    }

    const videoSelecionado = resultado.assets[0];

    const video = {
      uri: videoSelecionado.uri,
      name:
        videoSelecionado.fileName ||
        `exercicio-${id}.mp4`,
      type:
        videoSelecionado.mimeType ||
        'video/mp4',
    };

    const sucesso = await enviarVideo(id, video);

    if (!sucesso) {
      Alert.alert(
        'Erro',
        erro || 'Não foi possível enviar o vídeo.'
      );

      return false;
    }

    if (aoAtualizar) {
      await aoAtualizar();
    }

    Alert.alert(
      'Vídeo atualizado',
      'O vídeo do exercício foi atualizado com sucesso.'
    );

    return true;
  }

  return {
    enviarVideo,
    selecionarVideo,
    carregando,
    erro,
  };
}