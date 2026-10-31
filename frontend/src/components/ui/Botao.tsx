import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import { cores, raios } from '@/theme';

import { Pressionavel } from './Pressionavel';

export type VarianteBotao = 'primario' | 'secundario' | 'fantasma' | 'perigo';
export type TamanhoBotao = 'grande' | 'medio' | 'pequeno';

export interface BotaoProps {
  children: ReactNode;
  onPress?: () => void;
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  carregando?: boolean;
  disabled?: boolean;
  /** Nome de um ícone Ionicons, exibido à esquerda do rótulo. */
  icone?: keyof typeof Ionicons.glyphMap;
  /** Ocupa a largura toda (padrão: sim). */
  larguraTotal?: boolean;
  haptico?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

const ALTURAS: Record<TamanhoBotao, number> = { grande: 52, medio: 44, pequeno: 36 };

export function estiloVariante(variante: VarianteBotao) {
  switch (variante) {
    case 'secundario':
      return { fundo: cores.superficieElevada, texto: cores.texto, borda: cores.bordaForte };
    case 'fantasma':
      return { fundo: 'transparent', texto: cores.primaria, borda: 'transparent' };
    case 'perigo':
      return { fundo: 'transparent', texto: cores.perigo, borda: cores.perigo };
    default:
      return { fundo: cores.primaria, texto: cores.sobrePrimaria, borda: cores.primaria };
  }
}

/** Botão do app. Variantes: primario (amarelo), secundario, fantasma e perigo (vermelho). */
export function Botao({
  children,
  onPress,
  variante = 'primario',
  tamanho = 'grande',
  carregando = false,
  disabled = false,
  icone,
  larguraTotal = true,
  haptico = true,
  style,
  testID,
  accessibilityLabel,
}: BotaoProps) {
  const cor = estiloVariante(variante);
  const inativo = disabled || carregando;

  return (
    <Pressionavel
      onPress={onPress}
      disabled={inativo}
      haptico={haptico ? 'leve' : false}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inativo, busy: carregando }}
      style={[
        estilos.base,
        {
          height: ALTURAS[tamanho],
          backgroundColor: cor.fundo,
          borderColor: cor.borda,
          alignSelf: larguraTotal ? 'stretch' : 'flex-start',
          paddingHorizontal: tamanho === 'pequeno' ? 14 : 20,
        },
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator size="small" color={cor.texto} />
      ) : (
        <>
          {icone && <Ionicons name={icone} size={18} color={cor.texto} style={estilos.icone} />}
          <Text style={[estilos.texto, { color: cor.texto, fontSize: tamanho === 'pequeno' ? 13 : 15 }]}>
            {children}
          </Text>
        </>
      )}
    </Pressionavel>
  );
}

const estilos = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: raios.botao,
    borderWidth: 1,
  },
  icone: { marginRight: 8 },
  texto: { fontWeight: '700', letterSpacing: 0.6 },
});
