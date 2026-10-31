import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cores } from '@/theme';

/** Faixa sólida sobre a safe area superior: o conteúdo rolado não passa por baixo do relógio. */
export function VeuStatusBar() {
  const { top } = useSafeAreaInsets();

  if (top <= 0) {
    return null;
  }

  return <View pointerEvents="none" testID="veu-status-bar" style={[estilos.veu, { height: top }]} />;
}

const estilos = StyleSheet.create({
  veu: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: cores.fundo,
    zIndex: 10,
  },
});
