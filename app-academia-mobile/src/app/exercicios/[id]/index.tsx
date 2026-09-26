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

import { Button } from '@/components/button';
import { useExercicio } from '@/hooks/useExercicio';
import { useGerenciarExercicio } from '@/hooks/useGerenciarExercicio';
import { useImagemExercicio } from '@/hooks/useImagemExercicio';

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
        disabled={enviandoImagem}
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

      {exercicio.video && (
        <View style={styles.secao}>
          <Text style={styles.tituloSecao}>
            VÍDEO
          </Text>

          <Text style={styles.video}>
            Vídeo disponível
          </Text>
        </View>
      )}

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
            enviandoImagem
          }
        >
          EDITAR EXERCÍCIO
        </Button>

        <Button
          onPress={confirmarExclusao}
          disabled={
            excluindo ||
            enviandoImagem
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

  video: {
    color: '#AAAAAA',
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