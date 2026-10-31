import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { FichaLista } from '@/types/ficha.types';

interface CardFichaProps {
  ficha: FichaLista;
  onPress: () => void;
  onRemover?: () => void;
}

export function CardFicha({
  ficha,
  onPress,
  onRemover,
}: CardFichaProps) {
  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.areaPrincipal}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={styles.nome}>
          {ficha.nome}
        </Text>

        <Text style={styles.aluno}>
          {ficha.aluno_nome}
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

  aluno: {
    color: '#FECF2B',
    fontSize: 13,
    fontWeight: '600',
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
