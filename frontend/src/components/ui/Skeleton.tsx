import { useEffect, useState } from 'react';
import { Animated, DimensionValue, Platform, StyleProp, View, ViewStyle } from 'react-native';

import { cores, raios } from '@/theme';

export interface SkeletonProps {
  largura?: DimensionValue;
  altura?: number;
  raio?: number;
  style?: StyleProp<ViewStyle>;
}

/** Bloco pulsante que ocupa o lugar do conteúdo enquanto carrega. */
export function Skeleton({ largura = '100%', altura = 16, raio = raios.chip, style }: SkeletonProps) {
  const [opacidade] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const nativo = Platform.OS !== 'web';
    const animacao = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidade, { toValue: 1, duration: 700, useNativeDriver: nativo }),
        Animated.timing(opacidade, { toValue: 0.45, duration: 700, useNativeDriver: nativo }),
      ])
    );

    animacao.start();

    return () => animacao.stop();
  }, [opacidade]);

  return (
    <Animated.View
      accessibilityLabel="Carregando"
      style={[
        {
          width: largura,
          height: altura,
          borderRadius: raio,
          backgroundColor: cores.superficieElevada,
          opacity: opacidade,
        },
        style,
      ]}
    />
  );
}

/** Lista de linhas-esqueleto (padrão visual de `LinhaLista`). */
export function SkeletonLista({ linhas = 4 }: { linhas?: number }) {
  return (
    <View style={{ gap: 14 }} testID="skeleton-lista">
      {Array.from({ length: linhas }, (_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Skeleton largura={44} altura={44} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton largura="60%" altura={14} />
            <Skeleton largura="35%" altura={11} />
          </View>
        </View>
      ))}
    </View>
  );
}
