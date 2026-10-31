import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { cores, raios } from '@/theme';

export interface HeroGradienteProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Card grande com o gradiente dourado. O conteúdo deve usar `cores.sobrePrimaria`
 * (texto escuro) para manter o contraste.
 */
export function HeroGradiente({ children, style, testID }: HeroGradienteProps) {
  return (
    <LinearGradient
      colors={[...cores.gradienteDestaque]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[estilos.hero, style]}
      testID={testID}
    >
      {children}
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  hero: { borderRadius: raios.hero, padding: 24, overflow: 'hidden' },
});
