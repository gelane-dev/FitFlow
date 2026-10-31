import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { cores, raios } from '@/theme';

interface MiniaturaExercicioProps {
  uri?: string | null;
  tamanho?: number;
}

/** Miniatura quadrada da imagem do exercício (ícone de halter quando não há imagem). */
export function MiniaturaExercicio({ uri, tamanho = 56 }: MiniaturaExercicioProps) {
  const base = { width: tamanho, height: tamanho };

  if (uri) {
    return <Image source={{ uri }} style={[estilos.caixa, base]} contentFit="cover" />;
  }

  return (
    <View style={[estilos.caixa, estilos.vazia, base]}>
      <Ionicons name="barbell-outline" size={Math.round(tamanho * 0.42)} color={cores.textoTerciario} />
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    borderRadius: raios.chip,
    backgroundColor: cores.superficieElevada,
  },
  vazia: { alignItems: 'center', justifyContent: 'center' },
});
