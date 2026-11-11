import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

import { Pressionavel } from '@/components/ui/Pressionavel';
import { cores, raios } from '@/theme';

interface BotaoIconeProps {
  icone: keyof typeof Ionicons.glyphMap;
  /** Obrigatório: descreve a ação para leitores de tela (o ícone sozinho não basta). */
  rotulo: string;
  onPress: () => void;
  desabilitado?: boolean;
  perigo?: boolean;
  testID?: string;
}

/** Botão de ícone com área de toque de 44 pt e rótulo de acessibilidade. */
export function BotaoIcone({
  icone,
  rotulo,
  onPress,
  desabilitado = false,
  perigo = false,
  testID,
}: BotaoIconeProps) {
  return (
    <Pressionavel
      onPress={onPress}
      disabled={desabilitado}
      haptico="leve"
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: desabilitado }}
      style={[estilos.botao, desabilitado && estilos.desabilitado]}
    >
      <Ionicons name={icone} size={20} color={perigo ? cores.perigo : cores.texto} />
    </Pressionavel>
  );
}

const estilos = StyleSheet.create({
  botao: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: raios.botao,
    backgroundColor: cores.superficieElevada,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  desabilitado: { opacity: 0.35 },
});
