import { StyleSheet, Switch, Text, View } from 'react-native';

import { cores, espacamento, tipografia } from '@/theme';

export interface CampoInterruptorProps {
  rotulo: string;
  descricao?: string;
  valor: boolean;
  aoMudar: (valor: boolean) => void;
  disabled?: boolean;
  testID?: string;
}

/** Linha com rótulo, descrição e interruptor (altura mínima de 56 pt, a linha inteira é o alvo semântico). */
export function CampoInterruptor({ rotulo, descricao, valor, aoMudar, disabled = false, testID }: CampoInterruptorProps) {
  return (
    <View style={estilos.linha}>
      <View style={estilos.textos}>
        <Text style={estilos.rotulo}>{rotulo}</Text>
        {descricao ? <Text style={estilos.descricao}>{descricao}</Text> : null}
      </View>
      <Switch
        value={valor}
        onValueChange={aoMudar}
        disabled={disabled}
        trackColor={{ false: cores.bordaForte, true: cores.primariaSuave }}
        thumbColor={valor ? cores.primaria : cores.textoSecundario}
        // Na web o polegar ligado usa esta propriedade (senão fica no verde padrão).
        {...({ activeThumbColor: cores.primaria } as object)}
        accessibilityLabel={rotulo}
        accessibilityHint={descricao}
        accessibilityState={{ checked: valor, disabled }}
        testID={testID}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacamento.lg,
    paddingVertical: espacamento.sm,
  },
  textos: { flex: 1, gap: 2 },
  rotulo: { ...tipografia.corpoForte, color: cores.texto },
  descricao: { ...tipografia.legenda, color: cores.textoSecundario },
});
