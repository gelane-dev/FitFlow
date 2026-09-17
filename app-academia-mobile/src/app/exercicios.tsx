import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { router } from 'expo-router';

import { CardExercicio } from '@/components/CardExercicio';
import { useExercicios } from '@/hooks/useExercicios';

export default function Exercicios() {
  const {
    exercicios,
    carregando,
    erro,
  } = useExercicios();

  if (carregando) {
    return (
      <View style={styles.carregando}>
        <ActivityIndicator
          size="large"
          color="#FECF2B"
        />

        <Text style={styles.textoCarregando}>
          Carregando exercícios...
        </Text>
      </View>
    );
  }

  if (erro) {
    return (
      <View style={styles.mensagem}>
        <Text style={styles.tituloErro}>
          Erro ao carregar exercícios
        </Text>

        <Text style={styles.textoErro}>
          {erro}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>
          EXERCÍCIOS
        </Text>

        <Text style={styles.subtitulo}>
          Biblioteca de exercícios
        </Text>
      </View>

      <FlatList
        data={exercicios}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <CardExercicio
            exercicio={item}
            onPress={() =>
              router.push({
                pathname: '/exercicios/[id]',
                params: {
                  id: item.id.toString(),
                },
              })
            }
          />
        )}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
    paddingHorizontal: 20,
    paddingTop: 50,
  },

  cabecalho: {
    marginBottom: 25,
  },

  titulo: {
    color: '#FECF2B',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  subtitulo: {
    color: '#AAAAAA',
    fontSize: 14,
    marginTop: 5,
  },

  lista: {
    paddingBottom: 30,
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