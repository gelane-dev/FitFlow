import { useCallback } from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { router, useFocusEffect } from 'expo-router';

import { CardFicha } from '@/components/CardFicha';
import { useFichas } from '@/hooks/useFichas';
import { useGerenciarFicha } from '@/hooks/useGerenciarFicha';

export default function Fichas() {
  const {
    fichas,
    carregando,
    erro,
    recarregar,
  } = useFichas();

  const { deletar } = useGerenciarFicha();

  useFocusEffect(
    useCallback(() => {
      recarregar();
    }, [recarregar])
  );

  function confirmarExclusao(id: number, nome: string) {
    Alert.alert(
      'Excluir ficha',
      `Deseja realmente excluir "${nome}" e todos os seus treinos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const sucesso = await deletar(id);
            if (sucesso) {
              await recarregar();
            }
          },
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
          Carregando fichas...
        </Text>
      </View>
    );
  }

  if (erro) {
    return (
      <View style={styles.mensagem}>
        <Text style={styles.tituloErro}>
          Erro ao carregar fichas
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
        <Text
          style={styles.voltar}
          onPress={() => router.replace('/exercicios')}
        >
          ‹ Exercícios
        </Text>

        <Text style={styles.titulo}>
          FICHAS
        </Text>

        <Text style={styles.subtitulo}>
          Montagem de treino
        </Text>

        <Text style={styles.informacao}>
          {fichas.length} ficha{fichas.length === 1 ? '' : 's'}
        </Text>

        <TouchableOpacity
          style={styles.botaoNovo}
          onPress={() => router.push('/fichas/nova')}
        >
          <Text style={styles.textoBotaoNovo}>
            + NOVA FICHA
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={fichas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <CardFicha
            ficha={item}
            onPress={() =>
              router.push({
                pathname: '/fichas/[id]' as any,
                params: {
                  id: item.id.toString(),
                },
              })
            }
            onRemover={() => confirmarExclusao(item.id, item.nome)}
          />
        )}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.vazio}>
            Nenhuma ficha cadastrada.
          </Text>
        }
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
    marginBottom: 20,
  },

  voltar: {
    color: '#FECF2B',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 18,
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

  vazio: {
    color: '#777777',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
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
