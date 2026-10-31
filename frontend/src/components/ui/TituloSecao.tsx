import { StyleSheet, Text, View } from 'react-native';

import { cores } from '@/theme';

import { Pressionavel } from './Pressionavel';

export interface TituloSecaoProps {
  titulo: string;
  /** Ação opcional à direita (ex.: "Ver tudo"). */
  acao?: { rotulo: string; onPress: () => void };
}

/** Título de seção: rótulo pequeno em MAIÚSCULO com espaço acima. */
export function TituloSecao({ titulo, acao }: TituloSecaoProps) {
  return (
    <View style={estilos.linha}>
      <Text style={estilos.titulo} accessibilityRole="header">
        {titulo}
      </Text>
      {acao && (
        <Pressionavel onPress={acao.onPress} hitSlop={8}>
          <Text style={estilos.acao}>{acao.rotulo}</Text>
        </Pressionavel>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 32,
    marginBottom: 12,
  },
  titulo: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  acao: { color: cores.primaria, fontSize: 13, fontWeight: '600' },
});
