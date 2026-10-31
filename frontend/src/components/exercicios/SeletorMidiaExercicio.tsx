import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { Button } from '@/components/button';

type ArquivoMidia = {
  uri: string;
  name: string;
  type: string;
};

type TipoMidia = 'imagem' | 'video';

type SeletorMidiaExercicioProps = {
  idExercicio: number;
  tipo: TipoMidia;
  existeMidia: boolean;
  carregando: boolean;
  bloqueado?: boolean;
  erro?: string | null;
  enviar: (
    idExercicio: number,
    arquivo: ArquivoMidia,
  ) => Promise<boolean>;
  aoEnviarComSucesso: () => Promise<void>;
};

export function SeletorMidiaExercicio({
  idExercicio,
  tipo,
  existeMidia,
  carregando,
  bloqueado = false,
  erro,
  enviar,
  aoEnviarComSucesso,
}: SeletorMidiaExercicioProps) {
  const [selecionando, setSelecionando] = useState(false);

  const ehImagem = tipo === 'imagem';

  async function selecionarMidia() {
    try {
      setSelecionando(true);

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ehImagem ? ['images'] : ['videos'],
        allowsEditing: false,
        ...(ehImagem ? { quality: 0.8 } : { quality: 1 }),
      });

      if (resultado.canceled || !resultado.assets[0]) {
        return;
      }

      const midiaSelecionada = resultado.assets[0];
      const arquivo: ArquivoMidia = {
        uri: midiaSelecionada.uri,
        name:
          midiaSelecionada.fileName ||
          `exercicio-${idExercicio}.${ehImagem ? 'jpg' : 'mp4'}`,
        type:
          midiaSelecionada.mimeType ||
          (ehImagem ? 'image/jpeg' : 'video/mp4'),
      };

      const sucesso = await enviar(idExercicio, arquivo);

      if (!sucesso) {
        Alert.alert(
          'Erro',
          erro ||
            `Não foi possível enviar ${ehImagem ? 'a imagem' : 'o vídeo'}.`,
        );
        return;
      }

      await aoEnviarComSucesso();

      Alert.alert(
        `${ehImagem ? 'Imagem' : 'Vídeo'} atualizado${ehImagem ? 'a' : 'o'}`,
        `${ehImagem ? 'A imagem' : 'O vídeo'} do exercício foi atualizado com sucesso.`,
      );
    } catch {
      Alert.alert(
        'Erro',
        `Não foi possível selecionar ou enviar ${ehImagem ? 'a imagem' : 'o vídeo'}.`,
      );
    } finally {
      setSelecionando(false);
    }
  }

  return (
    <Button
      onPress={selecionarMidia}
      disabled={bloqueado || carregando || selecionando}
    >
      {carregando || selecionando
        ? `ENVIANDO ${ehImagem ? 'IMAGEM' : 'VÍDEO'}...`
        : `${existeMidia ? 'ALTERAR' : 'ADICIONAR'} ${ehImagem ? 'IMAGEM' : 'VÍDEO'}`}
    </Button>
  );
}
