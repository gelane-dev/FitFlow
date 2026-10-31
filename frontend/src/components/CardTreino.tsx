import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Treino } from '@/types/ficha.types';

interface CardTreinoProps {
  treino: Treino;
  onPress: () => void;
  onRemover?: () => void;
}

export function CardTreino({
  treino,
  onPress,
  onRemover,
}: CardTreinoProps) {
  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.areaPrincipal}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={styles.nome}>
          {treino.nome}
        </Text>

        <Text style={styles.dia}>
          {treino.dia_semana} · ordem {treino.ordem}
        </Text>
      </TouchableOpacity>

      {onRemover && (
        <TouchableOpacity
          style={styles.botaoRemover}
          onPress={onRemover}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.textoRemover}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },

  areaPrincipal: {
    flex: 1,
    padding: 18,
  },

  nome: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 6,
  },

  dia: {
    color: '#FECF2B',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  botaoRemover: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  textoRemover: {
    color: '#777777',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
