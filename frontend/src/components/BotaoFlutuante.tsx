import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text } from 'react-native';

import { Pressionavel } from '@/components/ui/Pressionavel';
import { cores, raios } from '@/theme';

interface BotaoFlutuanteProps {
  rotulo: string;
  onPress: () => void;
  icone?: keyof typeof Ionicons.glyphMap;
  testID?: string;
}

/**
 * Botão de ação flutuante (pílula amarela no canto inferior direito). Deve ficar
 * dentro de um container `flex: 1` irmão da `Tela`, para flutuar sobre a lista.
 */
export function BotaoFlutuante({ rotulo, onPress, icone, testID }: BotaoFlutuanteProps) {
  return (
    <Pressionavel
      onPress={onPress}
      haptico="media"
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={estilos.botao}
    >
      {icone ? <Ionicons name={icone} size={18} color={cores.sobrePrimaria} /> : null}
      <Text style={estilos.texto}>{rotulo}</Text>
    </Pressionavel>
  );
}

/** Espaço no fim da lista para o botão flutuante não cobrir o último item. */
export const ESPACO_BOTAO_FLUTUANTE = 96;

const estilos = StyleSheet.create({
  botao: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: raios.pilula,
    backgroundColor: cores.primaria,
    borderWidth: 1,
    borderColor: cores.primariaPressionada,
  },
  texto: { color: cores.sobrePrimaria, fontSize: 14, fontWeight: '700', letterSpacing: 0.4 },
});
