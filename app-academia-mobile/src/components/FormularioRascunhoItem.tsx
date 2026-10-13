import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { RascunhoItem } from '@/types/ficha.types';

interface FormularioRascunhoItemProps {
  rascunho: RascunhoItem;
  onAtualizar: (campo: keyof RascunhoItem, valor: string) => void;
  onAbrirSeletor: () => void;
  onSalvar: () => void;
  onCancelar: () => void;
  salvando: boolean;
}

export function FormularioRascunhoItem({
  rascunho,
  onAtualizar,
  onAbrirSeletor,
  onSalvar,
  onCancelar,
  salvando,
}: FormularioRascunhoItemProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Exercício</Text>

      <TouchableOpacity
        style={styles.seletorExercicio}
        onPress={onAbrirSeletor}
        activeOpacity={0.8}
      >
        <Text
          style={
            rascunho.exercicioNome
              ? styles.nomeExercicio
              : styles.placeholder
          }
        >
          {rascunho.exercicioNome || 'Selecionar exercício'}
        </Text>

        {rascunho.grupoMuscular ? (
          <Text style={styles.grupoMuscular}>
            {rascunho.grupoMuscular}
          </Text>
        ) : null}
      </TouchableOpacity>

      <View style={styles.grade}>
        <View style={styles.campoGrade}>
          <Text style={styles.label}>Séries</Text>
          <Input
            placeholder="4"
            placeholderTextColor="#888"
            keyboardType="number-pad"
            value={rascunho.series}
            onChangeText={(valor) => onAtualizar('series', valor)}
          />
        </View>

        <View style={styles.campoGrade}>
          <Text style={styles.label}>Reps</Text>
          <Input
            placeholder="12"
            placeholderTextColor="#888"
            keyboardType="number-pad"
            value={rascunho.repeticoes}
            onChangeText={(valor) => onAtualizar('repeticoes', valor)}
          />
        </View>
      </View>

      <View style={styles.grade}>
        <View style={styles.campoGrade}>
          <Text style={styles.label}>Carga (kg)</Text>
          <Input
            placeholder="40"
            placeholderTextColor="#888"
            keyboardType="decimal-pad"
            value={rascunho.carga}
            onChangeText={(valor) => onAtualizar('carga', valor)}
          />
        </View>

        <View style={styles.campoGrade}>
          <Text style={styles.label}>Descanso (s)</Text>
          <Input
            placeholder="60"
            placeholderTextColor="#888"
            keyboardType="number-pad"
            value={rascunho.descanso}
            onChangeText={(valor) => onAtualizar('descanso', valor)}
          />
        </View>
      </View>

      <Button onPress={onSalvar} disabled={salvando}>
        {salvando ? 'SALVANDO...' : 'SALVAR EXERCÍCIO'}
      </Button>

      <TouchableOpacity
        style={styles.botaoCancelar}
        onPress={onCancelar}
        activeOpacity={0.7}
      >
        <Text style={styles.textoCancelar}>CANCELAR</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
  },

  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },

  seletorExercicio: {
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginBottom: 16,
  },

  nomeExercicio: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  placeholder: {
    color: '#888888',
    fontSize: 15,
  },

  grupoMuscular: {
    color: '#FECF2B',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },

  grade: {
    flexDirection: 'row',
    gap: 10,
  },

  campoGrade: {
    flex: 1,
  },

  botaoCancelar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 12,
    marginTop: 14,
    alignItems: 'center',
  },

  textoCancelar: {
    color: '#FECF2B',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
});
