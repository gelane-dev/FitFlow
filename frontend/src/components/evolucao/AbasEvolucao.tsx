import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Pressionavel } from '@/components/ui/Pressionavel';
import { cores } from '@/theme';

export interface OpcaoAba<T extends string> {
  valor: T;
  rotulo: string;
  icone: keyof typeof Ionicons.glyphMap;
}

export interface AbasEvolucaoProps<T extends string> {
  opcoes: OpcaoAba<T>[];
  valor: T;
  onChange: (valor: T) => void;
}

/**
 * Alternador principal da tela: abas com ícone e sublinhado amarelo na aba ativa. É um nível acima
 * dos filtros (`Segmentado` compacto): troca o assunto da tela, não o recorte de um gráfico.
 */
export function AbasEvolucao<T extends string>({ opcoes, valor, onChange }: AbasEvolucaoProps<T>) {
  return (
    <View style={estilos.trilho} accessibilityRole="tablist">
      {opcoes.map((opcao) => {
        const ativa = opcao.valor === valor;
        const cor = ativa ? cores.primaria : cores.textoSecundario;

        return (
          <Pressionavel
            key={opcao.valor}
            onPress={() => onChange(opcao.valor)}
            haptico="leve"
            escala={1}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativa }}
            aria-selected={ativa}
            accessibilityLabel={opcao.rotulo}
            testID={`segmento-${opcao.valor}`}
            style={estilos.aba}
          >
            <View style={estilos.conteudo}>
              <Ionicons name={opcao.icone} size={18} color={cor} />
              <Text style={[estilos.texto, { color: cor }]}>{opcao.rotulo}</Text>
            </View>
            <View style={[estilos.indicador, ativa && estilos.indicadorAtivo]} />
          </Pressionavel>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  trilho: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: cores.borda },
  // 48 pt de altura: acima do mínimo de 44 pt.
  aba: { flex: 1, height: 48, justifyContent: 'flex-end' },
  conteudo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  texto: { fontSize: 16, fontWeight: '700' },
  indicador: { height: 3, marginBottom: -1, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: 'transparent' },
  indicadorAtivo: { backgroundColor: cores.primaria },
});
