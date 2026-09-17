import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { useExercicio } from '@/hooks/useExercicio';

export default function DetalhesExercicio() {
  const { id } = useLocalSearchParams();

  const idExercicio = Number(id);

  const {
    exercicio,
    carregando,
    erro,
  } = useExercicio(idExercicio);

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
          {erro || 'Exercício não encontrado.'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.conteudo}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.cabecalho}>
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
      </View>

      {exercicio.imagem && (
        <Image
          source={{ uri: exercicio.imagem }}
          style={styles.imagem}
          resizeMode="cover"
        />
      )}

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

  cabecalho: {
    marginBottom: 25,
  },

  voltar: {
    color: '#FECF2B',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 20,
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
  },

  imagem: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    marginBottom: 30,
    backgroundColor: '#1A1A1A',
  },

  secao: {
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
  },
});