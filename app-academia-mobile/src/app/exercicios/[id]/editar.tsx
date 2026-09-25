import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/button';
import { Input } from '@/components/input';

import { useExercicio } from '@/hooks/useExercicio';
import { useGerenciarExercicio } from '@/hooks/useGerenciarExercicio';

export default function EditarExercicio() {
  const { id } = useLocalSearchParams();

  const idExercicio = Number(id);

  const {
    exercicio,
    carregando: carregandoExercicio,
    erro: erroExercicio,
  } = useExercicio(idExercicio);

  const {
    atualizar,
    carregando: salvando,
    erro: erroAtualizacao,
  } = useGerenciarExercicio();

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [grupoMuscular, setGrupoMuscular] = useState('');

  useEffect(() => {
    if (!exercicio) {
      return;
    }

    setNome(exercicio.nome);
    setDescricao(exercicio.descricao);
    setGrupoMuscular(exercicio.grupo_muscular);
  }, [exercicio]);

  useEffect(() => {
    if (erroExercicio) {
      Alert.alert(
        'Erro',
        erroExercicio
      );
    }
  }, [erroExercicio]);

  useEffect(() => {
    if (erroAtualizacao) {
      Alert.alert(
        'Erro',
        erroAtualizacao
      );
    }
  }, [erroAtualizacao]);

  async function salvarAlteracoes() {
    if (!nome.trim()) {
      Alert.alert(
        'Atenção',
        'Informe o nome do exercício.'
      );

      return;
    }

    if (!descricao.trim()) {
      Alert.alert(
        'Atenção',
        'Informe a descrição do exercício.'
      );

      return;
    }

    if (!grupoMuscular.trim()) {
      Alert.alert(
        'Atenção',
        'Informe o grupo muscular.'
      );

      return;
    }

    const exercicioAtualizado = await atualizar(
      idExercicio,
      {
        nome: nome.trim(),
        descricao: descricao.trim(),
        grupo_muscular: grupoMuscular.trim(),
      }
    );

    if (!exercicioAtualizado) {
      return;
    }

    Alert.alert(
      'Exercício atualizado',
      'As alterações foram salvas com sucesso.',
      [
        {
          text: 'OK',
          onPress: () => router.replace('/exercicios'),
        },
      ]
    );
  }

  if (carregandoExercicio) {
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

  if (erroExercicio || !exercicio) {
    return (
      <View style={styles.mensagem}>
        <Text style={styles.tituloErro}>
          Erro ao carregar exercício
        </Text>

        <Text style={styles.textoErro}>
          {erroExercicio || 'Exercício não encontrado.'}
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
    <ImageBackground
      source={require('@/assets/images/backgrounds/fundo-login.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.conteudo}>
          <Text
            style={styles.voltar}
            onPress={() => router.back()}
          >
            ‹ Voltar
          </Text>

          <Text style={styles.titulo}>
            EDITAR EXERCÍCIO
          </Text>

          <Text style={styles.label}>
            Nome
          </Text>

          <Input
            placeholder="Digite o nome do exercício"
            placeholderTextColor="#888"
            value={nome}
            onChangeText={setNome}
          />

          <Text style={styles.label}>
            Descrição
          </Text>

          <Input
            placeholder="Digite a descrição do exercício"
            placeholderTextColor="#888"
            value={descricao}
            onChangeText={setDescricao}
            multiline
            style={styles.inputDescricao}
          />

          <Text style={styles.label}>
            Grupo muscular
          </Text>

          <Input
            placeholder="Ex.: Peito, Costas, Pernas"
            placeholderTextColor="#888"
            value={grupoMuscular}
            onChangeText={setGrupoMuscular}
          />

          <Button
            onPress={salvarAlteracoes}
            disabled={salvando}
          >
            {salvando
              ? 'SALVANDO...'
              : 'SALVAR ALTERAÇÕES'}
          </Button>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },

  conteudo: {
    flex: 1,
    width: '85%',
    maxWidth: 500,
    alignSelf: 'center',
    justifyContent: 'center',
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
    marginBottom: 30,
  },

  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },

  inputDescricao: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 15,
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
});