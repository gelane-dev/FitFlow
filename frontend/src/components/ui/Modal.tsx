import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal as ModalNativo,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cores, raios } from '@/theme';

import { Pressionavel } from './Pressionavel';
import { useLarguraTela } from './useLarguraTela';

export interface ModalProps {
  visivel: boolean;
  titulo: string;
  aoFechar: () => void;
  children?: ReactNode;
  /** Botões de ação presos abaixo do conteúdo. */
  rodape?: ReactNode;
  testID?: string;
}

/**
 * Modal do design system: folha inferior no celular e diálogo centralizado a partir de 768.
 * Toque fora, botão "Fechar" e o voltar do Android chamam `aoFechar`.
 */
export function Modal({ visivel, titulo, aoFechar, children, rodape, testID }: ModalProps) {
  const { ehMedio } = useLarguraTela();
  const insets = useSafeAreaInsets();

  return (
    <ModalNativo
      visible={visivel}
      transparent
      animationType={ehMedio ? 'fade' : 'slide'}
      statusBarTranslucent
      onRequestClose={aoFechar}
    >
      <KeyboardAvoidingView
        style={[estilos.fundo, ehMedio ? estilos.centro : estilos.base]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={aoFechar}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          testID="modal-fundo"
        />

        <View
          style={[
            estilos.caixa,
            ehMedio ? estilos.dialogo : [estilos.folha, { paddingBottom: insets.bottom + 16 }],
          ]}
          accessibilityViewIsModal
          testID={testID ?? 'modal'}
        >
          <View style={estilos.cabecalho}>
            <Text style={estilos.titulo} accessibilityRole="header" numberOfLines={2}>
              {titulo}
            </Text>
            <Pressionavel
              onPress={aoFechar}
              style={estilos.fechar}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              testID="modal-fechar"
            >
              <Ionicons name="close" size={22} color={cores.textoSecundario} />
            </Pressionavel>
          </View>

          <ScrollView
            style={estilos.corpo}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {rodape ? <View style={estilos.rodape}>{rodape}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </ModalNativo>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: cores.veu },
  base: { justifyContent: 'flex-end' },
  centro: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  caixa: {
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  folha: {
    maxHeight: '90%',
    borderTopLeftRadius: raios.hero,
    borderTopRightRadius: raios.hero,
  },
  dialogo: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '85%',
    borderRadius: raios.cartao,
    paddingBottom: 20,
  },
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 56 },
  titulo: { flex: 1, color: cores.texto, fontSize: 20, fontWeight: '700' },
  fechar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  corpo: { flexGrow: 0 },
  rodape: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', paddingTop: 16 },
});
