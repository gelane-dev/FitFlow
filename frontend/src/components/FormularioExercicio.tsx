import { useState } from 'react';

import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { ExercicioAtualizar } from '@/types/exercicio.types';

interface FormularioExercicioProps {
  exercicio: {
    nome: string;
    descricao: string;
    grupo_muscular: string;
  };
  salvando: boolean;
  desabilitado?: boolean;
  onSalvar: (dados: ExercicioAtualizar) => void;
}

export function FormularioExercicio({
  exercicio,
  salvando,
  desabilitado = false,
  onSalvar,
}: FormularioExercicioProps) {
  const [nome, setNome] = useState(exercicio.nome);
  const [descricao, setDescricao] = useState(exercicio.descricao);
  const [grupoMuscular, setGrupoMuscular] = useState(
    exercicio.grupo_muscular
  );

  function enviar() {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'Informe o nome do exercício.');

      return;
    }

    if (!descricao.trim()) {
      Alert.alert('Atenção', 'Informe a descrição do exercício.');

      return;
    }

    if (!grupoMuscular.trim()) {
      Alert.alert('Atenção', 'Informe o grupo muscular.');

      return;
    }

    onSalvar({
      nome: nome.trim(),
      descricao: descricao.trim(),
      grupo_muscular: grupoMuscular.trim(),
    });
  }

  return (
    <View>
      <View style={styles.campo}>
        <Text style={styles.label}>Nome</Text>

        <Input
          placeholder="Digite o nome do exercício"
          placeholderTextColor="#888"
          value={nome}
          onChangeText={setNome}
        />
      </View>

      <View style={styles.campo}>
        <Text style={styles.label}>Descrição</Text>

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
        <Text style={styles.label}>Grupo muscular</Text>

        <Input
          placeholder="Ex.: Peito, Costas, Pernas"
          placeholderTextColor="#888"
          value={grupoMuscular}
          onChangeText={setGrupoMuscular}
        />
      </View>

      <View style={styles.botaoSalvar}>
        <Button onPress={enviar} disabled={salvando || desabilitado}>
          {salvando ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
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
});
