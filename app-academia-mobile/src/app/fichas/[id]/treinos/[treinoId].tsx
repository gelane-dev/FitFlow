import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { CardItemTreino } from '@/components/CardItemTreino';
import { FormularioRascunhoItem } from '@/components/FormularioRascunhoItem';
import { ModalSeletorExercicio } from '@/components/ModalSeletorExercicio';
import { useGerenciarItemFicha } from '@/hooks/useGerenciarItemFicha';
import { useItensTreino } from '@/hooks/useItensTreino';
import { Exercicio } from '@/types/exercicio.types';
import { RascunhoItem } from '@/types/ficha.types';

function criarRascunho(): RascunhoItem {
  return {
    chave: `${Date.now()}-${Math.random()}`,
    exercicioId: null,
    exercicioNome: '',
    grupoMuscular: '',
    series: '',
    repeticoes: '',
    carga: '',
    descanso: '',
  };
}

export default function MontagemTreino() {
  const { id, treinoId, nomeTreino } = useLocalSearchParams();

  const idFicha = Number(id);
  const idTreino = Number(treinoId);

  const tituloTreino =
    typeof nomeTreino === 'string'
      ? nomeTreino
      : 'Montagem';

  const {
    itens,
    carregando,
    erro,
    recarregar,
  } = useItensTreino(idTreino);

  const {
    criar,
    deletar,
    carregando: salvando,
    erro: erroGestao,
  } = useGerenciarItemFicha();

  const [rascunhos, setRascunhos] = useState<RascunhoItem[]>([]);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [chaveSelecao, setChaveSelecao] = useState<string | null>(null);

  useEffect(() => {
    if (erro) {
      Alert.alert('Erro', erro);
    }
  }, [erro]);

  useEffect(() => {
    if (erroGestao) {
      Alert.alert('Erro', erroGestao);
    }
  }, [erroGestao]);

  function atualizarRascunho(
    chave: string,
    campo: keyof RascunhoItem,
    valor: string
  ) {
    setRascunhos((atual) =>
      atual.map((item) =>
        item.chave === chave
          ? { ...item, [campo]: valor }
          : item
      )
    );
  }

  function abrirSeletor(chave: string) {
    setChaveSelecao(chave);
    setModalVisivel(true);
  }

  function escolherExercicio(exercicio: Exercicio) {
    if (!chaveSelecao) {
      return;
    }

    setRascunhos((atual) =>
      atual.map((item) =>
        item.chave === chaveSelecao
          ? {
              ...item,
              exercicioId: exercicio.id,
              exercicioNome: exercicio.nome,
              grupoMuscular: exercicio.grupo_muscular,
            }
          : item
      )
    );

    setModalVisivel(false);
    setChaveSelecao(null);
  }

  async function salvarRascunho(rascunho: RascunhoItem) {
    if (!rascunho.exercicioId) {
      Alert.alert('Atenção', 'Selecione um exercício.');
      return;
    }

    const series = Number(rascunho.series);
    const repeticoes = Number(rascunho.repeticoes);
    const cargaNormalizada = rascunho.carga.replace(',', '.');
    const carga = Number(cargaNormalizada);
    const descanso = Number(rascunho.descanso);

    if (!series || series < 1) {
      Alert.alert('Atenção', 'Informe as séries.');
      return;
    }

    if (!repeticoes || repeticoes < 1) {
      Alert.alert('Atenção', 'Informe as repetições.');
      return;
    }

    if (Number.isNaN(carga) || rascunho.carga.trim() === '') {
      Alert.alert('Atenção', 'Informe a carga.');
      return;
    }

    if (!descanso || descanso < 1) {
      Alert.alert('Atenção', 'Informe o descanso em segundos.');
      return;
    }

    const proximaOrdem =
      itens.length > 0
        ? Math.max(...itens.map((i) => i.ordem)) + 1
        : 1;

    const item = await criar({
      ficha_id: idFicha,
      treino_id: idTreino,
      exercicio_id: rascunho.exercicioId,
      series,
      repeticoes,
      carga,
      descanso,
      ordem: proximaOrdem,
    });

    if (!item) {
      return;
    }

    setRascunhos((atual) =>
      atual.filter((itemAtual) => itemAtual.chave !== rascunho.chave)
    );

    await recarregar();
  }

  function confirmarExclusao(idItem: number, nome: string) {
    Alert.alert(
      'Remover exercício',
      `Deseja remover ${nome} deste treino?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const sucesso = await deletar(idItem);
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
        <ActivityIndicator size="large" color="#FECF2B" />
        <Text style={styles.textoCarregando}>Carregando montagem...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.conteudo}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={styles.voltar}
          onPress={() =>
            router.replace({
              pathname: '/fichas/[id]' as any,
              params: {
                id: idFicha.toString(),
              },
            })
          }
        >
          ‹ Voltar
        </Text>

        <Text style={styles.titulo}>{tituloTreino.toUpperCase()}</Text>
        <Text style={styles.subtitulo}>Séries, reps, carga e descanso</Text>

        {itens.map((item) => (
          <CardItemTreino
            key={item.id}
            item={item}
            onRemover={confirmarExclusao}
            desabilitado={salvando}
          />
        ))}

        {rascunhos.map((rascunho) => (
          <FormularioRascunhoItem
            key={rascunho.chave}
            rascunho={rascunho}
            onAtualizar={(campo, valor) =>
              atualizarRascunho(rascunho.chave, campo, valor)
            }
            onAbrirSeletor={() => abrirSeletor(rascunho.chave)}
            onSalvar={() => salvarRascunho(rascunho)}
            onCancelar={() =>
              setRascunhos((atual) =>
                atual.filter((item) => item.chave !== rascunho.chave)
              )
            }
            salvando={salvando}
          />
        ))}

        {itens.length === 0 && rascunhos.length === 0 && (
          <Text style={styles.vazio}>Nenhum exercício neste treino.</Text>
        )}

        <TouchableOpacity
          style={styles.botaoNovo}
          onPress={() =>
            setRascunhos((atual) => [...atual, criarRascunho()])
          }
          activeOpacity={0.8}
        >
          <Text style={styles.textoBotaoNovo}>+ ADICIONAR EXERCÍCIO</Text>
        </TouchableOpacity>
      </ScrollView>

      <ModalSeletorExercicio
        visivel={modalVisivel}
        onFechar={() => {
          setModalVisivel(false);
          setChaveSelecao(null);
        }}
        onSelecionar={escolherExercicio}
      />
    </View>
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
    marginBottom: 24,
  },

  botaoNovo: {
    backgroundColor: '#FECF2B',
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
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
    marginVertical: 20,
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
});
