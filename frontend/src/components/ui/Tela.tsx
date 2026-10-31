import { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cores, margemTela } from '@/theme';

import { VeuStatusBar } from './VeuStatusBar';

export interface TelaProps {
  children?: ReactNode;
  /** Conteúdo rolável (padrão: sim). */
  rolavel?: boolean;
  /** Habilita puxar-para-atualizar quando informado. */
  aoAtualizar?: () => void;
  atualizando?: boolean;
  /** A tela fica dentro das abas (a barra já cobre a safe area de baixo). */
  abas?: boolean;
  /** Usa rolagem que acompanha o teclado (formulários). */
  teclado?: boolean;
  /** Elemento preso ao rodapé (ex.: botão primário do formulário). */
  rodape?: ReactNode;
  /** Remove a margem lateral de 20. */
  semMargem?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Container padrão de tela: safe area, fundo `fundo`, margem lateral 20 e scroll opcional. */
export function Tela({
  children,
  rolavel = true,
  aoAtualizar,
  atualizando = false,
  abas = false,
  teclado = false,
  rodape,
  semMargem = false,
  style,
  testID,
}: TelaProps) {
  const insets = useSafeAreaInsets();

  const estiloConteudo: ViewStyle = {
    paddingTop: insets.top + 8,
    paddingBottom: (abas ? 0 : insets.bottom) + 32,
    paddingHorizontal: semMargem ? 0 : margemTela,
  };

  const refresh = aoAtualizar ? (
    <RefreshControl
      refreshing={atualizando}
      onRefresh={aoAtualizar}
      tintColor={cores.primaria}
      colors={[cores.primaria]}
      progressBackgroundColor={cores.superficieElevada}
    />
  ) : undefined;

  let corpo: ReactNode;

  if (!rolavel) {
    corpo = <View style={[estilos.fixo, estiloConteudo, style]}>{children}</View>;
  } else if (teclado) {
    corpo = (
      <KeyboardAwareScrollView
        style={estilos.rolagem}
        contentContainerStyle={[estiloConteudo, style]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={24}
        refreshControl={refresh}
      >
        {children}
      </KeyboardAwareScrollView>
    );
  } else {
    corpo = (
      <ScrollView
        style={estilos.rolagem}
        contentContainerStyle={[estiloConteudo, style]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={refresh}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={estilos.raiz} testID={testID}>
      {corpo}
      <VeuStatusBar />
      {rodape ? (
        <View style={[estilos.rodape, { paddingBottom: (abas ? 0 : insets.bottom) + 12 }]}>
          {rodape}
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.fundo },
  rolagem: { flex: 1 },
  fixo: { flex: 1 },
  rodape: {
    paddingTop: 12,
    paddingHorizontal: margemTela,
    backgroundColor: cores.fundo,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cores.borda,
  },
});
