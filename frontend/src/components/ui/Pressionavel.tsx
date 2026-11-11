import { ReactNode } from 'react';
import { Platform, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

import { IntensidadeHaptica, tocarHaptico } from './haptics';

export interface PressionavelProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Escala ao pressionar (padrão 0.97). */
  escala?: number;
  /** Intensidade do haptics ao tocar; `false` desliga. Padrão: nenhum. */
  haptico?: IntensidadeHaptica | false;
  /**
   * A área pressionável contém outros botões (ex.: linha clicável com "Aprovar"/"Recusar").
   * Na web `role="button"` vira `<button>`, e botão dentro de botão é HTML inválido (aviso do React,
   * leitura ambígua). Com esta prop o contêiner vira um `div` focável (`role="group"`, Enter aciona)
   * e os botões internos continuam botões. No app nativo nada muda.
   */
  contemControles?: boolean;
}

/** Base de todo toque do app: escala + opacidade ao pressionar e haptics opcional. */
export function Pressionavel({
  children,
  style,
  escala = 0.97,
  haptico = false,
  onPress,
  disabled,
  contemControles = false,
  ...rest
}: PressionavelProps) {
  const semBotaoNaWeb = contemControles && Platform.OS === 'web';

  return (
    <Pressable
      {...rest}
      {...(semBotaoNaWeb ? {
            accessibilityRole: undefined,
            role: 'group' as const,
            // Sem isso o leitor de tela lê o conteúdo mas não anuncia que a linha abre algo.
            'aria-roledescription': 'item acionável',
          } : null)}
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
