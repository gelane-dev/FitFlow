import { useState } from 'react';

import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { router } from 'expo-router';

import { CardExercicio } from '@/components/CardExercicio';
import { useExercicios } from '@/hooks/useExercicios';

export default function Exercicios() {
  const [paginaSolicitada, setPaginaSolicitada] = useState(1);

  const {
    exercicios,
    pagina,
    limite,
    total,
    totalPaginas,
    carregando,
    erro,
  } = useExercicios(paginaSolicitada);

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

        <Text style={styles.informacao}>
          {total} exercícios • {limite} por página
        </Text>

        <TouchableOpacity
          style={styles.botaoNovo}
          onPress={() => router.push('/exercicios/novo')}
        >
          <Text style={styles.textoBotaoNovo}>
            + NOVO EXERCÍCIO
          </Text>
        </TouchableOpacity>
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

      <View style={styles.paginacao}>
        <TouchableOpacity
          style={[
            styles.botaoPaginacao,
            pagina === 1 && styles.botaoDesabilitado,
          ]}
          disabled={pagina === 1}
          onPress={() =>
            setPaginaSolicitada(pagina - 1)
          }
        >
          <Text style={styles.textoBotao}>
            ANTERIOR
          </Text>
        </TouchableOpacity>

        <Text style={styles.numeroPagina}>
          Página {pagina} de {totalPaginas}
        </Text>

        <TouchableOpacity
          style={[
            styles.botaoPaginacao,
            pagina === totalPaginas &&
              styles.botaoDesabilitado,
          ]}
          disabled={pagina === totalPaginas}
          onPress={() =>
            setPaginaSolicitada(pagina + 1)
          }
        >
          <Text style={styles.textoBotao}>
            PRÓXIMA
          </Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 20,
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

  informacao: {
    color: '#777777',
    fontSize: 12,
    marginTop: 8,
  },

  botaoNovo: {
    backgroundColor: '#FECF2B',
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 18,
  },

  textoBotaoNovo: {
    color: '#111111',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  lista: {
    paddingBottom: 20,
  },

  paginacao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },

  botaoPaginacao: {
    backgroundColor: '#FECF2B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },

  botaoDesabilitado: {
    opacity: 0.3,
  },

  textoBotao: {
    color: '#111111',
    fontSize: 11,
    fontWeight: 'bold',
  },

  numeroPagina: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
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