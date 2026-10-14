import { useCallback } from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/button';
import { CardTreino } from '@/components/CardTreino';
import { useFicha } from '@/hooks/useFicha';
import { useGerenciarFicha } from '@/hooks/useGerenciarFicha';
import { useGerenciarTreino } from '@/hooks/useGerenciarTreino';
import { useTreinos } from '@/hooks/useTreinos';

export default function DetalheFicha() {
  const { id } = useLocalSearchParams();

  const idFicha = Number(id);

  const {
    ficha,
    carregando: carregandoFicha,
    erro: erroFicha,
    recarregar: recarregarFicha,
  } = useFicha(idFicha);

  const {
    treinos,
    carregando: carregandoTreinos,
    erro: erroTreinos,
    recarregar: recarregarTreinos,
  } = useTreinos(idFicha);

  const { deletar: deletarTreino } = useGerenciarTreino();
  const { deletar: deletarFicha } = useGerenciarFicha();

  useFocusEffect(
    useCallback(() => {
      recarregarTreinos();
      recarregarFicha();
    }, [recarregarTreinos, recarregarFicha])
  );

  const proximaOrdem =
    treinos.length > 0
      ? Math.max(...treinos.map((t) => t.ordem)) + 1
      : 1;

  function confirmarExclusaoTreino(idTreino: number, nomeTreino: string) {
    Alert.alert(
      'Excluir treino',
      `Deseja realmente excluir "${nomeTreino}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const sucesso = await deletarTreino(idTreino);
            if (sucesso) {
              await recarregarTreinos();
            }
          },
        },
      ]
    );
  }

  function confirmarExclusaoFicha() {
    if (!ficha) return;
    Alert.alert(
      'Excluir ficha',
      `Deseja realmente excluir "${ficha.nome}" e todos os seus treinos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const sucesso = await deletarFicha(idFicha);
            if (sucesso) {
              router.replace('/fichas');
            }
          },
        },
      ]
    );
  }

  if (carregandoFicha || carregandoTreinos) {
    return (
      <View style={styles.carregando}>
        <ActivityIndicator
          size="large"
          color="#FECF2B"
        />

        <Text style={styles.textoCarregando}>
          Carregando ficha...
        </Text>
      </View>
    );
  }

  if (erroFicha || !ficha) {
    return (
      <View style={styles.mensagem}>
        <Text style={styles.tituloErro}>
          Erro ao carregar ficha
        </Text>

        <Text style={styles.textoErro}>
          {erroFicha || 'Ficha não encontrada.'}
        </Text>

        <View style={styles.botaoVoltar}>
          <Button onPress={() => router.back()}>
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
        onPress={() => router.replace('/fichas')}
      >
        ‹ Fichas
      </Text>

      <Text style={styles.titulo}>
        {ficha.nome.toUpperCase()}
      </Text>

      <Text style={styles.subtitulo}>
        {ficha.aluno_nome}
      </Text>

      {erroTreinos ? (
        <Text style={styles.textoErroLista}>
          {erroTreinos}
        </Text>
      ) : null}

      <TouchableOpacity
        style={styles.botaoNovo}
        onPress={() =>
          router.push({
            pathname: '/fichas/[id]/treinos/novo' as any,
            params: {
              id: idFicha.toString(),
              ordem: String(proximaOrdem),
            },
          })
        }
      >
        <Text style={styles.textoBotaoNovo}>
          + NOVO TREINO
        </Text>
      </TouchableOpacity>

      {treinos.length === 0 ? (
        <Text style={styles.vazio}>
          Nenhum treino nesta ficha.
        </Text>
      ) : (
        treinos.map((treino) => (
          <CardTreino
            key={treino.id}
            treino={treino}
            onPress={() =>
              router.push({
                pathname: '/fichas/[id]/treinos/[treinoId]' as any,
                params: {
                  id: idFicha.toString(),
                  treinoId: treino.id.toString(),
                  nomeTreino: treino.nome,
                },
              })
            }
            onRemover={() =>
              confirmarExclusaoTreino(treino.id, treino.nome)
            }
          />
        ))
      )}

      <TouchableOpacity
        style={styles.botaoExcluirFicha}
        onPress={confirmarExclusaoFicha}
      >
        <Text style={styles.textoExcluirFicha}>
          EXCLUIR FICHA
        </Text>
      </TouchableOpacity>
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
    paddingBottom: 80,
  },

  voltar: {
    color: '#FECF2B',
    fontSize: 15,
    fontWeight: '600',
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
    marginBottom: 20,
  },

  botaoNovo: {
    backgroundColor: '#FECF2B',
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },

  textoBotaoNovo: {
    color: '#111111',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  vazio: {
    color: '#777777',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 30,
  },

  textoErroLista: {
    color: '#AAAAAA',
    fontSize: 14,
    marginBottom: 12,
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
    marginBottom: 25,
  },

  botaoVoltar: {
    width: '100%',
    maxWidth: 300,
  },

  botaoExcluirFicha: {
    marginTop: 35,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    backgroundColor: 'rgba(255, 68, 68, 0.08)',
  },

  textoExcluirFicha: {
    color: '#FF5555',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
});
