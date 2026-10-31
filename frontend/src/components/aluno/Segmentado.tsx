import { StyleSheet, Text, View } from 'react-native';

import { Pressionavel } from '@/components/ui/Pressionavel';
import { cores, raios } from '@/theme';

type OpcaoSegmentado<T extends string> = { valor: T; rotulo: string };

type SegmentadoProps<T extends string> = {
  opcoes: OpcaoSegmentado<T>[];
  valor: T;
  onChange: (valor: T) => void;
};

/** Segmented control: alterna entre poucas opções mutuamente exclusivas (ex.: Carga / Volume). */
export function Segmentado<T extends string>({ opcoes, valor, onChange }: SegmentadoProps<T>) {
  return (
    <View style={estilos.trilho} accessibilityRole="tablist">
      {opcoes.map((opcao) => {
        const ativa = opcao.valor === valor;

        return (
          <Pressionavel
            key={opcao.valor}
            onPress={() => onChange(opcao.valor)}
            haptico="leve"
            escala={0.98}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativa }}
            testID={`segmento-${opcao.valor}`}
            style={[estilos.opcao, ativa && estilos.opcaoAtiva]}
          >
            <Text style={[estilos.texto, ativa && estilos.textoAtivo]}>{opcao.rotulo}</Text>
          </Pressionavel>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  trilho: {
    flexDirection: 'row',
    backgroundColor: cores.superficieElevada,
    borderRadius: raios.botao,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 4,
  },
  opcao: {
    flex: 1,
    height: 40,
    borderRadius: raios.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcaoAtiva: { backgroundColor: cores.primaria },
  texto: { color: cores.textoSecundario, fontSize: 14, fontWeight: '700' },
  textoAtivo: { color: cores.sobrePrimaria },
});
