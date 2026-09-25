import { useEffect, useState } from 'react';
import {
  Alert,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { router } from 'expo-router';

import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { useGerenciarExercicio } from '@/hooks/useGerenciarExercicio';

export default function NovoExercicio() {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [grupoMuscular, setGrupoMuscular] = useState('');

  const {
    criar,
    carregando,
    erro,
  } = useGerenciarExercicio();

  useEffect(() => {
    if (erro) {
      Alert.alert(
        'Erro',
        erro
      );
    }
  }, [erro]);

  async function salvarExercicio() {
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

    const exercicio = await criar({
      nome: nome.trim(),
      descricao: descricao.trim(),
      grupo_muscular: grupoMuscular.trim(),
    });

    if (!exercicio) {
      return;
    }

    Alert.alert(
      'Exercício criado',
      'O exercício foi criado com sucesso.',
      [
        {
          text: 'OK',
          onPress: () => router.replace('/exercicios'),
        },
      ]
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
            NOVO EXERCÍCIO
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
            onPress={salvarExercicio}
            disabled={carregando}
          >
            {carregando
              ? 'SALVANDO...'
              : 'SALVAR EXERCÍCIO'}
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
});