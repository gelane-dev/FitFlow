import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text } from 'react-native';

import { cores, raios } from '@/theme';

import { Pressionavel } from './Pressionavel';

export interface ChipProps {
  rotulo: string;
  selecionado?: boolean;
  onPress?: () => void;
  icone?: keyof typeof Ionicons.glyphMap;
  testID?: string;
  /** Divide a linha em partes iguais com os outros chips (ex.: 7 dias numa linha só). */
  igual?: boolean;
}

/** Filtro/seleção compacta (ex.: dia da semana, grupo muscular). */
export function Chip({ rotulo, selecionado = false, onPress, icone, testID, igual = false }: ChipProps) {
  const corTexto = selecionado ? cores.sobrePrimaria : cores.textoSecundario;

  return (
    <Pressionavel
      onPress={onPress}
      disabled={!onPress}
      haptico={onPress ? 'leve' : false}
      testID={testID}
      hitSlop={{ top: 5, bottom: 5 }}
      accessibilityRole="button"
      accessibilityState={{ selected: selecionado }}
      style={[estilos.chip, igual && estilos.igual, selecionado && estilos.selecionado]}
    >
      {icone && <Ionicons name={icone} size={14} color={corTexto} style={estilos.icone} />}
      <Text style={[estilos.texto, { color: corTexto }]} numberOfLines={1}>{rotulo}</Text>
    </Pressionavel>
  );
}

const estilos = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 34,
    borderRadius: raios.chip,
    backgroundColor: cores.superficieElevada,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  igual: { flex: 1, paddingHorizontal: 0, justifyContent: 'center' },
  selecionado: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  icone: { marginRight: 6 },
  texto: { fontSize: 13, fontWeight: '600' },
});
