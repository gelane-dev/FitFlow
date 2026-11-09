import { StyleSheet, Text, View } from 'react-native';

import { cores, tipografia } from '@/theme';
import { formatarData } from '@/utils/datas';
import { formatarDataCurta } from '@/utils/evolucao';
import { formatarNumeroBr } from '@/utils/numeros';
import { ESPACO_FIXO } from '@/utils/pluralizacao';
import {
  calcularVariacao,
  DirecaoFavoravel,
  formatarDiferenca,
  formatarPercentual,
  setaDaVariacao,
  tomDaVariacao,
  TomVariacaoEvolucao,
} from '@/utils/variacaoEvolucao';

export interface ValorComparado {
  valor: number;
  data: string;
}

export interface ComparacaoValoresProps {
  /** Nome do que é medido (ex.: "Carga máxima", "Peso"); aparece acima do valor. */
  rotulo?: string;
  atual: ValorComparado;
  /** `null` = primeiro registro: mostra o texto de `semAnterior`, sem número de variação. */
  anterior: ValorComparado | null;
  unidade?: string;
  direcao: DirecaoFavoravel;
  /** "Primeiro registro" (treino) ou "Primeira avaliação" (físico). */
  semAnterior: string;
  /** Legenda curta sob a variação (ex.: "vs. treino anterior"). */
  legendaVariacao?: string;
  /** Rótulo para mostrar a medição anterior (valor e data) numa linha do cabeçalho (`-anterior`). */
  mostrarAnterior?: string;
  /** Prefixo dos testIDs (`-atual`, `-variacao`, `-sem-anterior`). */
  testID?: string;
}

const COR_TOM: Record<TomVariacaoEvolucao, string> = {
  favoravel: cores.sucesso,
  desfavoravel: cores.perigo,
  neutro: cores.textoSecundario,
};

const ROTULO_TOM: Record<TomVariacaoEvolucao, string> = {
  favoravel: 'melhora',
  desfavoravel: 'piora',
  neutro: 'sem juízo de valor',
};

export function textoValor(valor: number, unidade?: string): string {
  const numero = formatarNumeroBr(valor);

  return unidade ? `${numero}${ESPACO_FIXO}${unidade}` : numero;
}

/**
 * Cabeçalho do cartão de evolução: valor atual e data (uma vez só) e a variação em relação ao
 * anterior, com diferença absoluta e percentual. A cor segue a direção favorável, mas o sinal e a
 * seta sempre acompanham: a cor nunca fala sozinha. O valor anterior aparece em `IndicadoresLado`.
 */
export function ComparacaoValores({
  rotulo,
  atual,
  anterior,
  unidade,
  direcao,
  semAnterior,
  legendaVariacao,
  mostrarAnterior,
  testID = 'comparacao',
}: ComparacaoValoresProps) {
  const variacao = anterior ? calcularVariacao(atual.valor, anterior.valor) : null;
  const tom = tomDaVariacao(variacao, direcao);
  const cor = COR_TOM[tom];

  const resumo =
    `${rotulo ? `${rotulo}: ` : ''}atual ${textoValor(atual.valor, unidade)} em ${formatarData(atual.data)}. ` +
    (anterior
      ? `Anterior ${textoValor(anterior.valor, unidade)} em ${formatarData(anterior.data)}. ` +
        (variacao
          ? `Variação ${formatarDiferenca(variacao.absoluta, unidade)}` +
            (variacao.percentual !== null ? `, ${formatarPercentual(variacao.percentual)}` : '') +
            `, ${ROTULO_TOM[tom]}.`
          : '')
      : `${semAnterior}.`);

  return (
    <View style={estilos.cabecalho} accessible accessibilityLabel={resumo} testID={testID}>
      <View style={estilos.valores}>
        {rotulo ? <Text style={estilos.rotulo}>{rotulo}</Text> : null}
        <Text style={estilos.atual} testID={`${testID}-atual`}>
          {textoValor(atual.valor, unidade)}
        </Text>
        <Text style={estilos.data} testID={`${testID}-data`}>
          {formatarData(atual.data)}
        </Text>
      </View>

      <View style={estilos.variacaoColuna}>
        {variacao ? (
          <View>
          <View style={estilos.variacaoLinha}>
            <Text style={[estilos.seta, { color: cor }]}>{setaDaVariacao(variacao)}</Text>
            <Text style={[estilos.variacao, { color: cor }]} testID={`${testID}-variacao`}>
              {formatarDiferenca(variacao.absoluta, unidade)}
              {variacao.percentual !== null ? ` (${formatarPercentual(variacao.percentual)})` : ''}
            </Text>
          </View>
          {legendaVariacao ? <Text style={estilos.legenda}>{legendaVariacao}</Text> : null}
          </View>
        ) : (
          <Text style={estilos.semAnterior} testID={`${testID}-sem-anterior`}>
            {semAnterior}
          </Text>
        )}
      </View>

      {mostrarAnterior && anterior ? (
        <Text style={estilos.anterior} testID={`${testID}-anterior`}>
          {mostrarAnterior}: <Text style={estilos.anteriorValor}>{textoValor(anterior.valor, unidade)}</Text> · {formatarDataCurta(anterior.data)}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  // Quebra linha em telas estreitas: a variação desce para baixo do valor, sem corte.
  cabecalho: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    columnGap: 12,
    rowGap: 6,
  },
  valores: { gap: 2 },
  rotulo: { color: cores.textoSecundario, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  atual: { ...tipografia.numero, color: cores.texto, fontSize: 32, lineHeight: 38 },
  data: { color: cores.textoSecundario, fontSize: 13 },
  variacaoColuna: { flexShrink: 1 },
  variacaoLinha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legenda: { color: cores.textoTerciario, fontSize: 12, marginTop: 2 },
  anterior: { width: '100%', color: cores.textoSecundario, fontSize: 13 },
  anteriorValor: { color: cores.texto, fontWeight: '700' },
  seta: { fontSize: 18, fontWeight: '800' },
  variacao: { ...tipografia.numero, fontSize: 16 },
  semAnterior: { color: cores.textoSecundario, fontSize: 14, fontWeight: '600' },
});
