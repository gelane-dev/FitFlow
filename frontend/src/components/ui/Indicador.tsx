import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { cores, tamanhos, tipografia } from '@/theme';

import { Cartao } from './Cartao';
import { Skeleton } from './Skeleton';

export interface VariacaoIndicador {
  /** Ex.: "+12% vs. mês anterior". */
  texto: string;
  tendencia: 'alta' | 'queda' | 'estavel';
  /** Cor da variação: `true` verde, `false` vermelho, ausente neutro (a seta mostra o sentido). */
  favoravel?: boolean;
}

export interface IndicadorProps {
  rotulo: string;
  /** Já formatado (ex.: "R$ 1.234,56", "87"). */
  valor: string;
  variacao?: VariacaoIndicador;
  icone?: keyof typeof Ionicons.glyphMap;
  carregando?: boolean;
  aoPressionar?: () => void;
  testID?: string;
}

const ICONE_TENDENCIA = {
  alta: 'arrow-up',
  queda: 'arrow-down',
  estavel: 'remove',
} as const;

function corDaVariacao(favoravel?: boolean): string {
  if (favoravel === undefined) {
    return cores.textoSecundario;
  }

  return favoravel ? cores.sucesso : cores.perigo;
}

/**
 * Tamanho do valor conforme o comprimento: `adjustsFontSizeToFit` não funciona na web, e em cartões de
 * meia largura (celular) "R$ 339,90" não cabe a 28 px. Valor nunca termina em reticências (QA-GA-01).
 */
export function tamanhoFonteValor(valor: string): number {
  if (valor.length <= 7) return tamanhos.titulo;
  if (valor.length <= 9) return tamanhos.subtitulo;
  if (valor.length <= 12) return tamanhos.subtitulo - 2;

  return tamanhos.corpoForte;
}

/** KPI de painel: rótulo, valor grande em `tipografia.numero` e variação opcional. */
export function Indicador({ rotulo, valor, variacao, icone, carregando, aoPressionar, testID }: IndicadorProps) {
  const rotuloAcessivel = `${rotulo}: ${valor}${variacao ? `, ${variacao.texto}` : ''}`;

  return (
    <Cartao onPress={aoPressionar} testID={testID} style={estilos.cartao}>
      <View accessible accessibilityLabel={carregando ? `${rotulo}: carregando` : rotuloAcessivel}>
        <View style={estilos.topo}>
          <Text style={estilos.rotulo} numberOfLines={2}>
            {rotulo}
          </Text>
          {icone ? <Ionicons name={icone} size={18} color={cores.primaria} /> : null}
        </View>

        {carregando ? (
          <Skeleton largura="60%" altura={32} />
        ) : (
          <Text
            style={[estilos.valor, { fontSize: tamanhoFonteValor(valor), lineHeight: tamanhoFonteValor(valor) + 6 }]}
            adjustsFontSizeToFit
            testID={testID ? `${testID}-valor` : undefined}
          >
            {valor}
          </Text>
        )}

        {variacao && !carregando ? (
          <View style={estilos.variacao}>
            <Ionicons
              name={ICONE_TENDENCIA[variacao.tendencia]}
              size={14}
              color={corDaVariacao(variacao.favoravel)}
            />
            <Text style={[estilos.textoVariacao, { color: corDaVariacao(variacao.favoravel) }]}>
              {variacao.texto}
            </Text>
          </View>
        ) : null}
      </View>
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  cartao: { minHeight: 108 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  rotulo: { ...tipografia.rotulo, color: cores.textoSecundario, flex: 1 },
  valor: { ...tipografia.numero, color: cores.texto, fontSize: 28, lineHeight: 34 },
  variacao: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  textoVariacao: { fontSize: 12, fontWeight: '600' },
});
