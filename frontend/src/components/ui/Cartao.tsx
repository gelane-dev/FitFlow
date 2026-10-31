import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { cores, raios } from '@/theme';

import { Pressionavel } from './Pressionavel';

export interface CartaoProps {
  children?: ReactNode;
  /** Se informado, o cartão vira pressionável. */
  onPress?: () => void;
  /** Usa o fundo elevado em vez do fundo de superfície. */
  elevado?: boolean;
  semPadding?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Cartão padrão: fundo superficie, borda de 1 px, sem sombra. */
export function Cartao({ children, onPress, elevado, semPadding, style, testID }: CartaoProps) {
  const estiloBase = [
    estilos.cartao,
    elevado && { backgroundColor: cores.superficieElevada },
    !semPadding && estilos.padding,
    style,
  ];

  if (onPress) {
    return (
      <Pressionavel
        onPress={onPress}
        style={estiloBase}
        haptico="leve"
        testID={testID}
        accessibilityRole="button"
      >
        {children}
      </Pressionavel>
    );
  }

  return (
    <View style={estiloBase} testID={testID}>
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.cartao,
    overflow: 'hidden',
  },
  padding: { padding: 16 },
});
