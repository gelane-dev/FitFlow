import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { cores, fonteDisplay } from '@/theme';

export interface CabecalhoGrandeProps {
  /** Rótulo pequeno acima do título (saudação, data...). */
  rotulo?: string;
  titulo: string;
  /** Ação ou avatar à direita. */
  direita?: ReactNode;
}

/** Cabeçalho estilo Nike das telas de aba: rótulo, título enorme e ação à direita. */
export function CabecalhoGrande({ rotulo, titulo, direita }: CabecalhoGrandeProps) {
  return (
    <View style={estilos.linha}>
      <View style={estilos.textos}>
        {rotulo ? <Text style={estilos.rotulo}>{rotulo}</Text> : null}
        <Text style={estilos.titulo} numberOfLines={2} accessibilityRole="header">
          {titulo}
        </Text>
      </View>
      {direita ? <View style={estilos.direita}>{direita}</View> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
  },
  textos: { flex: 1 },
  rotulo: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  titulo: { color: cores.texto, fontFamily: fonteDisplay, fontSize: 34, lineHeight: 40 },
  direita: { paddingBottom: 4 },
});
