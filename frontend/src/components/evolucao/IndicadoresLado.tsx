import { StyleSheet, Text, View } from 'react-native';

import { cores, tipografia } from '@/theme';

export interface IndicadorLado {
  rotulo: string;
  /** Texto principal (já formatado, com sinal/seta quando for variação). */
  valor: string;
  /** Cor do valor; sem ela vale o texto padrão. Sinal e seta sempre acompanham a cor. */
  cor?: string;
  /** Linha de apoio (datas, valor de referência). */
  detalhe?: string;
  accessibilityLabel?: string;
  testID?: string;
}

export interface IndicadoresLadoProps {
  itens: IndicadorLado[];
}

/** Dois (ou mais) indicadores curtos lado a lado, cada um num cartão pequeno. */
export function IndicadoresLado({ itens }: IndicadoresLadoProps) {
  return (
    <View style={estilos.linha}>
      {itens.map((item) => (
        <View
          key={item.rotulo}
          style={estilos.item}
          accessible
          accessibilityLabel={item.accessibilityLabel ?? `${item.rotulo}: ${item.valor}${item.detalhe ? `. ${item.detalhe}` : ''}`}
          testID={item.testID}
        >
          <Text style={estilos.rotulo}>{item.rotulo}</Text>
          <Text style={[estilos.valor, item.cor ? { color: item.cor } : null]}>{item.valor}</Text>
          {item.detalhe ? <Text style={estilos.detalhe}>{item.detalhe}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  // Dois por linha; em tela muito estreita cada um ocupa a linha inteira em vez de cortar.
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  item: {
    flexBasis: 120,
    flexGrow: 1,
    flexShrink: 1,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 14,
    padding: 12,
    gap: 2,
  },
  rotulo: { color: cores.textoSecundario, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  valor: { ...tipografia.numero, color: cores.texto, fontSize: 16, marginTop: 2 },
  detalhe: { color: cores.textoTerciario, fontSize: 12 },
});
