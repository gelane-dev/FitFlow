import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ItemFicha } from '@/types/ficha.types';

interface CardItemTreinoProps {
  item: ItemFicha;
  onRemover: (id: number, nome: string) => void;
  desabilitado?: boolean;
}

export function CardItemTreino({
  item,
  onRemover,
  desabilitado = false,
}: CardItemTreinoProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cabecalhoItem}>
        <View style={styles.ordemCirculo}>
          <Text style={styles.ordemTexto}>{item.ordem}</Text>
        </View>

        <View style={styles.infoExercicio}>
          <Text style={styles.nomeExercicio}>{item.nome}</Text>
          <Text style={styles.grupoMuscular}>{item.grupo_muscular}</Text>
        </View>
      </View>

      <View style={styles.blocoMetricas}>
        <Text style={styles.textoMetricas}>
          {item.series} × {item.repeticoes}, {item.carga} kg, {item.descanso} s
        </Text>
      </View>

      <TouchableOpacity
        style={styles.botaoRemover}
        onPress={() => onRemover(item.id, item.nome)}
        disabled={desabilitado}
        activeOpacity={0.7}
      >
        <Text style={styles.textoRemover}>REMOVER</Text>
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

  cabecalhoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },

  ordemCirculo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FECF2B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  ordemTexto: {
    color: '#111111',
    fontSize: 14,
    fontWeight: 'bold',
  },

  infoExercicio: {
    flex: 1,
  },

  nomeExercicio: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  grupoMuscular: {
    color: '#FECF2B',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },

  blocoMetricas: {
    backgroundColor: 'rgba(254, 207, 43, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(254, 207, 43, 0.25)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 4,
  },

  textoMetricas: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  botaoRemover: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 12,
    marginTop: 14,
    alignItems: 'center',
  },

  textoRemover: {
    color: '#FECF2B',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
});
