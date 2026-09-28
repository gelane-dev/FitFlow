import { useEffect, useState } from 'react';

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
import { Input } from '@/components/input';

import { useExercicio } from '@/hooks/useExercicio';
import { useGerenciarExercicio } from '@/hooks/useGerenciarExercicio';
import { useImagemExercicio } from '@/hooks/useImagemExercicio';

export default function EditarExercicio() {
  const { id } = useLocalSearchParams();

  const idExercicio = Number(id);

  const {
    exercicio,
    carregando: carregandoExercicio,
    erro: erroExercicio,
    recarregar,
  } = useExercicio(idExercicio);

  const {
    atualizar,
    carregando: salvando,
    erro: erroAtualizacao,
  } = useGerenciarExercicio();

  const {
    enviarImagem,
    carregando: enviandoImagem,
    erro: erroImagem,
  } = useImagemExercicio();

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
      Alert.alert('Erro', erroExercicio);
    }
  }, [erroExercicio]);

  useEffect(() => {
    if (erroAtualizacao) {
      Alert.alert('Erro', erroAtualizacao);
    }
  }, [erroAtualizacao]);

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
          'Não foi possível atualizar a imagem.'
      );

      return;
    }

    await recarregar();

    Alert.alert(
      'Imagem atualizada',
      'A imagem do exercício foi atualizada com sucesso.'
    );
  }

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

    const exercicioAtualizado =
      await atualizar(
        idExercicio,
        {
          nome: nome.trim(),
          descricao: descricao.trim(),
          grupo_muscular:
            grupoMuscular.trim(),
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
          onPress: () =>
            router.replace('/exercicios'),
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
          {erroExercicio ||
            'Exercício não encontrado.'}
        </Text>

        <View style={styles.botaoVoltar}>
          <Button
            onPress={() =>
              router.back()
            }
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
        onPress={() =>
          router.back()
        }
      >
        ‹ Voltar
      </Text>

      <Text style={styles.titulo}>
        EDITAR EXERCÍCIO
      </Text>

      <Text style={styles.label}>
        Imagem
      </Text>

      {exercicio.imagem ? (
        <Image
          source={{
            uri: exercicio.imagem,
          }}
          style={styles.imagem}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.semImagem}>
          <Text
            style={styles.textoSemImagem}
          >
            Nenhuma imagem cadastrada
          </Text>
        </View>
      )}

      <Button
        onPress={selecionarImagem}
        disabled={
          enviandoImagem ||
          salvando
        }
      >
        {enviandoImagem
          ? 'ENVIANDO IMAGEM...'
          : exercicio.imagem
            ? 'ALTERAR IMAGEM'
            : 'ADICIONAR IMAGEM'}
      </Button>

      <View style={styles.campo}>
        <Text style={styles.label}>
          Nome
        </Text>

        <Input
          placeholder="Digite o nome do exercício"
          placeholderTextColor="#888"
          value={nome}
          onChangeText={setNome}
        />
      </View>
 
      <View style={styles.campo}>
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
      </View>

      <View style={styles.campo}>
        <Text style={styles.label}>
          Grupo muscular
        </Text>

        <Input
          placeholder="Ex.: Peito, Costas, Pernas"
          placeholderTextColor="#888"
          value={grupoMuscular}
          onChangeText={setGrupoMuscular}
        />
      </View>

      <View style={styles.botaoSalvar}>
        <Button
          onPress={salvarAlteracoes}
          disabled={
            salvando ||
            enviandoImagem
          }
        >
          {salvando
            ? 'SALVANDO...'
            : 'SALVAR ALTERAÇÕES'}
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
    marginBottom: 30,
  },

  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },

  imagem: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    marginBottom: 12,
  },

  semImagem: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  textoSemImagem: {
    color: '#777777',
    fontSize: 14,
  },

  campo: {
    marginTop: 25,
  },

  inputDescricao: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 15,
  },

  botaoSalvar: {
    marginTop: 10,
    marginBottom: 20,
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