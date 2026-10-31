import { StyleSheet, Text, View } from 'react-native';

import { cores, tipografia } from '@/theme';

export interface BlocoEstatisticaProps {
  valor: string | number;
  rotulo: string;
  unidade?: string;
  /** Destaca o número em amarelo. */
  destaque?: boolean;
}

/** Número grande (fonte do sistema, algarismos tabulares) com rótulo pequeno embaixo (estilo Strava). */
export function BlocoEstatistica({ valor, rotulo, unidade, destaque }: BlocoEstatisticaProps) {
  return (
    <View
      style={estilos.bloco}
      accessible
      accessibilityLabel={`${rotulo}: ${valor}${unidade ? ` ${unidade}` : ''}`}
    >
      <Text
        style={[estilos.valor, destaque && { color: cores.primaria }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {valor}
        {unidade ? <Text style={estilos.unidade}> {unidade}</Text> : null}
      </Text>
      <Text style={estilos.rotulo} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {rotulo}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { flex: 1 },
  valor: { ...tipografia.numero, color: cores.texto, fontSize: 28, lineHeight: 34 },
  unidade: { fontSize: 13, fontWeight: '600', color: cores.textoSecundario },
  rotulo: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
