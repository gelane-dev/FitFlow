import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { cores, raios } from '@/theme';

interface PreviaMidiaExercicioProps {
  uri?: string | null;
  nome?: string;
  textoVazio?: string;
}

/** Imagem grande (16:9) do exercício; sem imagem mostra um espaço reservado. */
export function PreviaMidiaExercicio({
  uri,
  nome,
  textoVazio = 'Nenhuma imagem cadastrada',
}: PreviaMidiaExercicioProps) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={estilos.caixa}
        contentFit="cover"
        accessibilityLabel={nome ? `Imagem do exercício ${nome}` : 'Imagem do exercício'}
      />
    );
  }

  return (
    <View style={[estilos.caixa, estilos.vazia]}>
      <Ionicons name="image-outline" size={36} color={cores.textoTerciario} />
      <Text style={estilos.textoVazio}>{textoVazio}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: raios.cartao,
    backgroundColor: cores.superficieElevada,
    overflow: 'hidden',
  },
  vazia: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: cores.borda,
    borderStyle: 'dashed',
  },
  textoVazio: { color: cores.textoTerciario, fontSize: 13 },
});
