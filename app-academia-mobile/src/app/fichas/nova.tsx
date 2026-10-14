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

import { router } from 'expo-router';

import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { useAlunos } from '@/hooks/useAlunos';
import { useGerenciarFicha } from '@/hooks/useGerenciarFicha';

export default function NovaFicha() {
  const [nome, setNome] = useState('');
  const [alunoId, setAlunoId] = useState<number | null>(null);

  const {
    alunos,
    carregando: carregandoAlunos,
    erro: erroAlunos,
  } = useAlunos();

  const {
    criar,
    carregando,
    erro,
  } = useGerenciarFicha();

  useEffect(() => {
    if (erro) {
      Alert.alert('Erro', erro);
    }
  }, [erro]);

  useEffect(() => {
    if (erroAlunos) {
      Alert.alert('Erro', erroAlunos);
    }
  }, [erroAlunos]);

  async function salvarFicha() {
    if (!nome.trim()) {
      Alert.alert(
        'Atenção',
        'Informe o nome da ficha.'
      );

      return;
    }

    if (!alunoId) {
      Alert.alert(
        'Atenção',
        'Selecione o aluno.'
      );

      return;
    }

    const ficha = await criar({
      nome: nome.trim(),
      aluno_id: alunoId,
    });

    if (!ficha) {
      return;
    }

    Alert.alert(
      'Ficha criada',
      'Agora você pode adicionar os treinos.',
      [
        {
          text: 'OK',
          onPress: () =>
            router.replace({
              pathname: '/fichas/[id]' as any,
              params: {
                id: ficha.id.toString(),
              },
            }),
        },
      ]
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
        NOVA FICHA
      </Text>

      <Text style={styles.label}>
        Nome
      </Text>

      <Input
        placeholder="Ex.: Hipertrofia - ciclo 1"
        placeholderTextColor="#888"
        value={nome}
        onChangeText={setNome}
      />

      <Text style={styles.label}>
        Aluno
      </Text>

      {carregandoAlunos ? (
        <ActivityIndicator
          color="#FECF2B"
          style={styles.loaderAlunos}
        />
      ) : (
        alunos.map((aluno) => {
          const selecionado = aluno.id === alunoId;

          return (
            <TouchableOpacity
              key={aluno.id}
              style={[
                styles.cardAluno,
                selecionado && styles.cardAlunoSelecionado,
              ]}
              onPress={() => setAlunoId(aluno.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.nomeAluno}>
                {aluno.nome}
              </Text>
            </TouchableOpacity>
          );
        })
      )}

      {!carregandoAlunos && alunos.length === 0 && (
        <Text style={styles.vazio}>
          Nenhum aluno cadastrado.
        </Text>
      )}

      <View style={styles.botaoSalvar}>
        <Button
          onPress={salvarFicha}
          disabled={carregando}
        >
          {carregando ? 'SALVANDO...' : 'CRIAR FICHA'}
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

  loaderAlunos: {
    marginVertical: 20,
  },

  cardAluno: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  cardAlunoSelecionado: {
    borderColor: '#FECF2B',
  },

  nomeAluno: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  vazio: {
    color: '#777777',
    fontSize: 14,
    marginBottom: 20,
  },

  botaoSalvar: {
    marginTop: 20,
  },
});
