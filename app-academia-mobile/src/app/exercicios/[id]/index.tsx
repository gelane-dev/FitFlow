import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';

import { Button } from '@/components/button';
import { useExercicio } from '@/hooks/useExercicio';
import { useGerenciarExercicio } from '@/hooks/useGerenciarExercicio';
import { useImagemExercicio } from '@/hooks/useImagemExercicio';
import { useVideoExercicio } from '@/hooks/useVideoExercicio';

function VideoPlayerExercicio({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
  });

  return (
    <VideoView
      style={styles.playerVideo}
      player={player}
      contentFit="contain"
      nativeControls
    />
  );
}

export default function DetalhesExercicio() {
  const { id } = useLocalSearchParams();

  const idExercicio = Number(id);

  const {
    exercicio,
    carregando,
    erro,
    recarregar,
  } = useExercicio(idExercicio);

  const {
    deletar,
    carregando: excluindo,
    erro: erroExclusao,
  } = useGerenciarExercicio();

  const {
    enviarImagem,
    carregando: enviandoImagem,
    erro: erroImagem,
  } = useImagemExercicio();

  const {
    enviarVideo,
    carregando: enviandoVideo,
    erro: erroVideo,
  } = useVideoExercicio();

  async function selecionarImagem() {
    const resultado =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

    if (resultado.canceled) {
      return;
    }

    const imagemSelecionada =
      resultado.assets[0];

    const imagem = {
      uri: imagemSelecionada.uri,
      name:
        imagemSelecionada.fileName ||
        `exercicio-${idExercicio}.jpg`,
      type:
        imagemSelecionada.mimeType ||
        'image/jpeg',
    };

    const sucesso = await enviarImagem(
      idExercicio,
      imagem
    );

    if (!sucesso) {
      Alert.alert(
        'Erro',
        erroImagem ||
        'Não foi possível enviar a imagem.'
      );

      return;
    }

    await recarregar();

    Alert.alert(
      'Imagem atualizada',
      'A imagem do exercício foi atualizada com sucesso.'
    );
  }

  async function selecionarVideo() {
    const resultado =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

    if (resultado.canceled) {
      return;
    }

    const videoSelecionado =
      resultado.assets[0];

    const video = {
      uri: videoSelecionado.uri,
      name:
        videoSelecionado.fileName ||
        `exercicio-${idExercicio}.mp4`,
      type:
        videoSelecionado.mimeType ||
        'video/mp4',
    };

    const sucesso = await enviarVideo(
      idExercicio,
      video
    );

    if (!sucesso) {
      Alert.alert(
        'Erro',
        erroVideo ||
        'Não foi possível enviar o vídeo.'
      );

      return;
    }

    await recarregar();

    Alert.alert(
      'Vídeo atualizado',
      'O vídeo do exercício foi atualizado com sucesso.'
    );
  }

  function confirmarExclusao() {
    Alert.alert(
      'Excluir exercício',
      'Tem certeza que deseja excluir este exercício?',
      [
        {
          text: 'CANCELAR',
          style: 'cancel',
        },
        {
          text: 'EXCLUIR',
          style: 'destructive',
          onPress: excluirExercicio,
        },
      ]
    );
  }

  async function excluirExercicio() {
    const sucesso = await deletar(idExercicio);

    if (!sucesso) {
      Alert.alert(
        'Erro',
        erroExclusao ||
        'Não foi possível excluir o exercício.'
      );

      return;
    }

    Alert.alert(
      'Exercício excluído',
      'O exercício foi excluído com sucesso.',
      [
        {
          text: 'OK',
          onPress: () =>
            router.replace('/exercicios'),
        },
      ]
    );
  }

  if (carregando) {
    return (
      <View style={styles.carregando}>
        <ActivityIndicator
          size="large"
          color="#FECF2B"
        />

        <Text style={styles.textoCarregando}>
          Carregando exercício...
        </Text>
      </View>
    );
  }

  if (erro || !exercicio) {
    return (
      <View style={styles.mensagem}>
        <Text style={styles.tituloErro}>
          Erro ao carregar exercício
        </Text>

        <Text style={styles.textoErro}>
          {erro ||
            'Exercício não encontrado.'}
        </Text>

        <View style={styles.botaoVoltar}>
          <Button
            onPress={() => router.back()}
          >
            VOLTAR
          </Button>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.conteudo}
      showsVerticalScrollIndicator={false}
    >
      <Text
        style={styles.voltar}
        onPress={() => router.back()}
      >
        ‹ Voltar
      </Text>

      <Text style={styles.titulo}>
        {exercicio.nome}
      </Text>

      <Text style={styles.grupoMuscular}>
        {exercicio.grupo_muscular}
      </Text>

      {exercicio.imagem ? (
        <Image
          source={{ uri: exercicio.imagem }}
          style={styles.imagem}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.semImagem}>
          <Text style={styles.textoSemImagem}>
            Nenhuma imagem cadastrada
          </Text>
        </View>
      )}

      <Button
        onPress={selecionarImagem}
        disabled={
          enviandoImagem ||
          enviandoVideo ||
          excluindo
        }
      >
        {enviandoImagem
          ? 'ENVIANDO IMAGEM...'
          : exercicio.imagem
            ? 'ALTERAR IMAGEM'
            : 'ADICIONAR IMAGEM'}
      </Button>

      <View style={styles.secao}>
        <Text style={styles.tituloSecao}>
          DESCRIÇÃO
        </Text>

        <Text style={styles.descricao}>
          {exercicio.descricao}
        </Text>
      </View>

      <View style={styles.secao}>
        <Text style={styles.tituloSecao}>
          VÍDEO
        </Text>

        {exercicio.video ? (
          <VideoPlayerExercicio uri={exercicio.video} />
        ) : (
          <View style={styles.semVideo}>
            <Text style={styles.textoSemVideo}>
              Nenhum vídeo cadastrado
            </Text>
          </View>
        )}

        <Button
          onPress={selecionarVideo}
          disabled={
            enviandoVideo ||
            enviandoImagem ||
            excluindo
          }
        >
          {enviandoVideo
            ? 'ENVIANDO VÍDEO...'
            : exercicio.video
              ? 'ALTERAR VÍDEO'
              : 'ADICIONAR VÍDEO'}
        </Button>
      </View>

      <View style={styles.acoes}>
        <Button
          onPress={() =>
            router.push({
              pathname:
                '/exercicios/[id]/editar',
              params: {
                id: idExercicio.toString(),
              },
            })
          }
          disabled={
            excluindo ||
            enviandoImagem ||
            enviandoVideo
          }
        >
          EDITAR EXERCÍCIO
        </Button>

        <Button
          onPress={confirmarExclusao}
          disabled={
            excluindo ||
            enviandoImagem ||
            enviandoVideo
          }
        >
          {excluindo
            ? 'EXCLUINDO...'
            : 'EXCLUIR EXERCÍCIO'}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },

  conteudo: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },

  voltar: {
    color: '#FECF2B',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 25,
  },

  titulo: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  grupoMuscular: {
    color: '#FECF2B',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 25,
  },

  imagem: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    marginBottom: 15,
    backgroundColor: '#1A1A1A',
  },

  semImagem: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    marginBottom: 15,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  textoSemImagem: {
    color: '#777777',
    fontSize: 14,
  },

  secao: {
    marginTop: 30,
    marginBottom: 30,
  },

  tituloSecao: {
    color: '#FECF2B',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 10,
  },

  descricao: {
    color: '#CCCCCC',
    fontSize: 15,
    lineHeight: 23,
  },

  playerVideo: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    marginBottom: 12,
  },

  semVideo: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  textoSemVideo: {
    color: '#777777',
    fontSize: 14,
  },

  acoes: {
    gap: 12,
    marginTop: 10,
  },

  carregando: {
    flex: 1,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },

  textoCarregando: {
    color: '#AAAAAA',
    fontSize: 14,
    marginTop: 12,
  },

  mensagem: {
    flex: 1,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  tituloErro: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },

  textoErro: {
    color: '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },

  botaoVoltar: {
    width: '100%',
    maxWidth: 300,
  },
});