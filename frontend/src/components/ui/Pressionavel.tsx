import { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

import { IntensidadeHaptica, tocarHaptico } from './haptics';

export interface PressionavelProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Escala ao pressionar (padrão 0.97). */
  escala?: number;
  /** Intensidade do haptics ao tocar; `false` desliga. Padrão: nenhum. */
  haptico?: IntensidadeHaptica | false;
}

/** Base de todo toque do app: escala + opacidade ao pressionar e haptics opcional. */
export function Pressionavel({
  children,
  style,
  escala = 0.97,
  haptico = false,
  onPress,
  disabled,
  ...rest
}: PressionavelProps) {
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPress={(evento) => {
        if (haptico) {
          tocarHaptico(haptico);
        }

        onPress?.(evento);
      }}
      style={({ pressed }) => [
        style,
        pressed && { transform: [{ scale: escala }], opacity: 0.85 },
        disabled && { opacity: 0.5 },
      ]}
    >
      {children}
    </Pressable>
  );
}
