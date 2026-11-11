import { Children, ReactNode, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colunasPorLargura, LARGURA_MAXIMA_CONTEUDO } from '@/utils/larguraTela';

import { useLarguraTela } from './useLarguraTela';

export interface ConteudoLargoProps {
  children?: ReactNode;
  /** Largura máxima do conteúdo (padrão 1200). */
  larguraMaxima?: number;
  style?: StyleProp<ViewStyle>;
  /** Só para nomear a região quando ela for um bloco com sentido próprio; sem ele o wrapper é transparente. */
  accessibilityLabel?: string;
  testID?: string;
}

/** Limita a largura do conteúdo (1200) e o centraliza; no celular ocupa tudo. */
export function ConteudoLargo({
  children,
  larguraMaxima = LARGURA_MAXIMA_CONTEUDO,
  style,
  accessibilityLabel,
  testID,
}: ConteudoLargoProps) {
  return (
    <View
      style={[estilos.raiz, { maxWidth: larguraMaxima }, style]}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {children}
    </View>
  );
}

export interface GradeProps {
  children?: ReactNode;
  /** Número fixo de colunas; sem ele, 1/2/3/4 conforme a largura do próprio container. */
  colunas?: number;
  /** Espaço entre células (padrão 16). */
  espaco?: number;
  testID?: string;
}

/** Grade responsiva: distribui os filhos em 1 a 4 colunas de largura igual. */
export function Grade({ children, colunas, espaco = 16, testID }: GradeProps) {
  const { largura: larguraJanela } = useLarguraTela();
  const [larguraContainer, setLarguraContainer] = useState<number | null>(null);

  const numero = Math.max(1, colunas ?? colunasPorLargura(larguraContainer ?? larguraJanela));
  const meio = espaco / 2;

  function aoMedir(evento: LayoutChangeEvent) {
    // O container tem margem negativa de `meio` em cada lado: soma de volta a largura útil.
    setLarguraContainer(evento.nativeEvent.layout.width - espaco);
  }

  return (
    <View
      style={[estilos.grade, { marginHorizontal: -meio, marginVertical: -meio }]}
      onLayout={colunas ? undefined : aoMedir}
      testID={testID}
    >
      {Children.toArray(children).map((filho, indice) => (
        <View key={indice} style={{ width: `${100 / numero}%`, padding: meio }}>
          {filho}
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { width: '100%', alignSelf: 'center' },
  grade: { flexDirection: 'row', flexWrap: 'wrap' },
});
