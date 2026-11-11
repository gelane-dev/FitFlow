import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { cores, raios } from '@/theme';

interface EtiquetaProps {
  rotulo: string;
  icone?: keyof typeof Ionicons.glyphMap;
  /** Amarela (destaque) ou neutra. */
  destaque?: boolean;
}

/**
 * Etiqueta somente de leitura, com o visual do `Chip`. Use dentro de áreas que já são botões
 * (cartões clicáveis): o `Chip` renderiza um botão e a web não aceita botão dentro de botão.
 */
export function Etiqueta({ rotulo, icone, destaque = false }: EtiquetaProps) {
  const cor = destaque ? cores.sobrePrimaria : cores.textoSecundario;

  return (
    <View style={[estilos.etiqueta, destaque && estilos.destaque]}>
      {icone ? <Ionicons name={icone} size={14} color={cor} style={estilos.icone} /> : null}
      <Text style={[estilos.texto, { color: cor }]} numberOfLines={1}>
        {rotulo}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    height: 34,
    borderRadius: raios.chip,
    backgroundColor: cores.superficieElevada,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  destaque: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  icone: { marginRight: 6 },
  texto: { fontSize: 13, fontWeight: '600' },
});
