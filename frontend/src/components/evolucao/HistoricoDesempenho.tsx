import { StyleSheet, Text, View } from 'react-native';

import { Cartao } from '@/components/ui/Cartao';
import { LinhaLista } from '@/components/ui/LinhaLista';
import { cores, tipografia } from '@/theme';
import { PontoEvolucao } from '@/types/evolucao.types';
import { formatarData } from '@/utils/datas';
import { formatarNumeroBr } from '@/utils/numeros';
import { comUnidade } from '@/utils/pluralizacao';

export interface HistoricoDesempenhoProps {
  /** Pontos do período em ordem crescente; a lista mostra os mais recentes primeiro. */
  pontos: PontoEvolucao[];
  exercicioId: number;
  aoVerDetalhe: (exercicioId: number) => void;
}

/** Quantos registros o histórico mostra; o resto fica no detalhe do exercício. */
export const REGISTROS_NO_HISTORICO = 3;

/**
 * Histórico de desempenho do exercício: os 3 registros mais recentes do período e o atalho para o
 * histórico completo, sempre visível (mesmo quando o período não tem registros).
 */
export function HistoricoDesempenho({ pontos, exercicioId, aoVerDetalhe }: HistoricoDesempenhoProps) {
  const recentes = pontos.slice(-REGISTROS_NO_HISTORICO).reverse();

  const link = (
    <Cartao semPadding>
      <LinhaLista
        titulo="Ver todo o histórico do exercício"
        icone="stats-chart-outline"
        separador={false}
        testID="link-detalhe-exercicio"
        onPress={() => aoVerDetalhe(exercicioId)}
      />
    </Cartao>
  );

  if (recentes.length === 0) {
    return link;
  }

  return (
    <View style={estilos.bloco} testID="historico-desempenho">
      <Cartao semPadding>
        {recentes.map((ponto, i) => (
          <View
            key={ponto.data}
            style={[estilos.linha, i < recentes.length - 1 && estilos.separador]}
            accessible
            accessibilityLabel={
              `${formatarData(ponto.data)}: carga máxima ${formatarNumeroBr(ponto.carga_maxima)} kg, ` +
              `${ponto.series} séries, ${ponto.repeticoes_maximas} repetições no máximo, ` +
              `volume ${formatarNumeroBr(ponto.volume)} kg`
            }
            testID={`historico-ponto-${ponto.data}`}
          >
            <View style={estilos.dataColuna}>
              <Text style={estilos.data}>{formatarData(ponto.data)}</Text>
              <Text style={estilos.detalhe}>
                {ponto.series} {ponto.series === 1 ? 'série' : 'séries'} · até {ponto.repeticoes_maximas} reps
              </Text>
            </View>
            <View style={estilos.valores}>
              <Text style={estilos.carga}>{comUnidade(formatarNumeroBr(ponto.carga_maxima), 'kg')}</Text>
              <Text style={estilos.detalhe}>vol. {comUnidade(formatarNumeroBr(ponto.volume), 'kg')}</Text>
            </View>
          </View>
        ))}
      </Cartao>

      {link}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { gap: 12 },
  linha: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  separador: { borderBottomWidth: 1, borderBottomColor: cores.borda },
  dataColuna: { flex: 1 },
  data: { color: cores.texto, fontSize: 15, fontWeight: '600' },
  detalhe: { color: cores.textoSecundario, fontSize: 13 },
  valores: { alignItems: 'flex-end', flexShrink: 0 },
  carga: { ...tipografia.numero, color: cores.texto, fontSize: 16 },
});
