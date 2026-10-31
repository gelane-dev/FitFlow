import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode, useContext } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ContextoAutenticacao } from '@/contexts/AuthContext';
import { cores, espacamento } from '@/theme';
import { rotaInicialDoPerfil } from '@/utils/rotas';

import { Pressionavel } from './Pressionavel';

export interface CabecalhoDetalheProps {
  titulo?: string;
  /** Ação à direita (ex.: botão de editar). */
  direita?: ReactNode;
  /** Padrão: `router.back()` (ou a aba inicial do perfil logado se não houver para onde voltar). */
  aoVoltar?: () => void;
}

function voltarPadrao(tipoPerfil?: string | null) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(rotaInicialDoPerfil(tipoPerfil));
  }
}

/** Cabeçalho das telas de detalhe/fluxo (sem barra de abas): voltar, título e ação. */
export function CabecalhoDetalhe({ titulo, direita, aoVoltar }: CabecalhoDetalheProps) {
  const { usuario } = useContext(ContextoAutenticacao);

  return (
    <View style={estilos.linha}>
      <Pressionavel
        onPress={aoVoltar ?? (() => voltarPadrao(usuario?.tipo))}
        haptico="leve"
        testID="botao-voltar"
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        style={estilos.voltar}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={22} color={cores.texto} />
      </Pressionavel>

      <Text style={estilos.titulo} numberOfLines={1} accessibilityRole="header">
        {titulo ?? ''}
      </Text>

      <View style={estilos.direita}>{direita}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  // O respiro de baixo separa o cabeçalho do primeiro cartão (QA P-08).
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    gap: 12,
    marginBottom: espacamento.lg,
  },
  voltar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: cores.superficieElevada,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { flex: 1, color: cores.texto, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  direita: { minWidth: 40, alignItems: 'flex-end' },
});
