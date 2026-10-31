import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Exercicio } from '@/types/exercicio.types';

interface CardExercicioProps {
  exercicio: Exercicio;
  onPress: () => void;
  onEditar: () => void;
}

export function CardExercicio({
  exercicio,
  onPress,
  onEditar,
}: CardExercicioProps) {
  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.areaPrincipal}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={styles.nome}>
          {exercicio.nome}
        </Text>

        <Text style={styles.grupoMuscular}>
          {exercicio.grupo_muscular}
        </Text>

        <Text
          style={styles.descricao}
          numberOfLines={2}
        >
          {exercicio.descricao}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.botaoEditar}
        onPress={onEditar}
        activeOpacity={0.8}
      >
        <Text style={styles.textoEditar}>
          EDITAR
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },

  areaPrincipal: {
    padding: 18,
  },

  nome: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 6,
  },

  grupoMuscular: {
    color: '#FECF2B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },

  descricao: {
    color: '#AAAAAA',
    fontSize: 13,
    lineHeight: 19,
  },

  botaoEditar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    alignItems: 'center',
  },

  textoEditar: {
    color: '#FECF2B',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
});
