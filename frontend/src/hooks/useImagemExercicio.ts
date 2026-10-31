import axios from 'axios';
import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

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

  async function selecionarImagem(
    id: number,
    aoAtualizar?: () => Promise<void> | void
  ): Promise<boolean> {
    const resultado =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

    if (resultado.canceled) {
      return false;
    }

    const imagemSelecionada = resultado.assets[0];

    const imagem = {
      uri: imagemSelecionada.uri,
      name:
        imagemSelecionada.fileName ||
        `exercicio-${id}.jpg`,
      type:
        imagemSelecionada.mimeType ||
        'image/jpeg',
    };

    const sucesso = await enviarImagem(id, imagem);

    if (!sucesso) {
      Alert.alert(
        'Erro',
        erro || 'Não foi possível enviar a imagem.'
      );

      return false;
    }

    if (aoAtualizar) {
      await aoAtualizar();
    }

    Alert.alert(
      'Imagem atualizada',
      'A imagem do exercício foi atualizada com sucesso.'
    );

    return true;
  }

  return {
    enviarImagem,
    selecionarImagem,
    carregando,
    erro,
  };
}