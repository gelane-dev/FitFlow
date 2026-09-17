import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Exercicio } from '@/types/exercicio.types';

interface CardExercicioProps {
  exercicio: Exercicio;
  onPress?: () => void;
}

export function CardExercicio({
  exercicio,
  onPress,
}: CardExercicioProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.conteudo}>
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
      </View>

      <Text style={styles.seta}>
        ›
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 120,
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  conteudo: {
    flex: 1,
  },

  nome: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 5,
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

  seta: {
    color: '#FECF2B',
    fontSize: 28,
    marginLeft: 10,
  },
});