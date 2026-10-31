import { useEffect, useState } from 'react';

import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { useGerenciarTreino } from '@/hooks/useGerenciarTreino';
import { DIAS_SEMANA, DiaSemana } from '@/types/ficha.types';

export default function NovoTreino() {
  const { id, ordem } = useLocalSearchParams();

  const idFicha = Number(id);

  const [nome, setNome] = useState('');
  const [diaSemana, setDiaSemana] = useState<DiaSemana>('segunda');
  const [ordemTreino, setOrdemTreino] = useState(
    typeof ordem === 'string' ? ordem : '1'
  );

  const {
    criar,
    carregando,
    erro,
  } = useGerenciarTreino();

  useEffect(() => {
    if (erro) {
      Alert.alert('Erro', erro);
    }
  }, [erro]);

  async function salvarTreino() {
    if (!nome.trim()) {
      Alert.alert(
        'Atenção',
        'Informe o nome do treino.'
      );

      return;
    }

    const ordemNumero = Number(ordemTreino);

    if (!ordemNumero || ordemNumero < 1) {
      Alert.alert(
        'Atenção',
        'Informe uma ordem válida.'
      );

      return;
    }

    const treino = await criar({
      ficha_id: idFicha,
      nome: nome.trim(),
      dia_semana: diaSemana,
      ordem: ordemNumero,
    });

    if (!treino) {
      return;
    }

    Alert.alert(
      'Treino criado',
      'Agora monte os exercícios desta sessão.',
      [
        {
          text: 'OK',
          onPress: () =>
            router.replace({
              pathname: '/fichas/[id]/treinos/[treinoId]' as any,
              params: {
                id: idFicha.toString(),
                treinoId: treino.id.toString(),
                nomeTreino: treino.nome,
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
        NOVO TREINO
      </Text>

      <Text style={styles.label}>
        Nome
      </Text>

      <Input
        placeholder="Ex.: Treino A"
        placeholderTextColor="#888"
        value={nome}
        onChangeText={setNome}
      />

      <Text style={styles.label}>
        Dia da semana
      </Text>

      <View style={styles.dias}>
        {DIAS_SEMANA.map((dia) => {
          const selecionado = dia === diaSemana;

          return (
            <TouchableOpacity
              key={dia}
              style={[
                styles.chip,
                selecionado && styles.chipSelecionado,
              ]}
              onPress={() => setDiaSemana(dia)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.textoChip,
                  selecionado && styles.textoChipSelecionado,
                ]}
              >
                {dia}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>
        Ordem
      </Text>

      <Input
        placeholder="1"
        placeholderTextColor="#888"
        keyboardType="number-pad"
        value={ordemTreino}
        onChangeText={setOrdemTreino}
      />

      <Button
        onPress={salvarTreino}
        disabled={carregando}
      >
        {carregando ? 'SALVANDO...' : 'CRIAR TREINO'}
      </Button>
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

  dias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },

  chip: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },

  chipSelecionado: {
    backgroundColor: '#FECF2B',
    borderColor: '#FECF2B',
  },

  textoChip: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  textoChipSelecionado: {
    color: '#111111',
  },
});
