import { useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Pressionavel } from '@/components/ui/Pressionavel';
import { cores, raios, tipografia } from '@/theme';
import { MetricaEvolucao, PontoEvolucao } from '@/types/evolucao.types';
import { formatarDataCurta, formatarNumero, larguraColuna, montarBarras } from '@/utils/evolucao';
import { ESPACO_FIXO } from '@/utils/pluralizacao';

type GraficoEvolucaoProps = {
  pontos: PontoEvolucao[];
  metrica: MetricaEvolucao;
};

const ALTURA_MAXIMA = 160;

/**
 * Gráfico de barras arredondadas feito com View (ADR-023): amarelo sobre fundo escuro,
 * valor selecionado em destaque no topo (padrão: o mais recente) e eixo discreto.
 */
export function GraficoEvolucao({ pontos, metrica }: GraficoEvolucaoProps) {
  const barras = montarBarras(pontos, metrica);
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [larguraArea, setLarguraArea] = useState(0);

  if (barras.length === 0) {
    return <Text style={estilos.vazio}>Sem registros para exibir.</Text>;
  }

  const indice = selecionada !== null && selecionada < barras.length ? selecionada : barras.length - 1;
  const atual = barras[indice];
  const unidade = metrica === 'carga_maxima' ? 'kg' : 'kg totais';
  // As barras dividem a largura toda do cartão; com muitas, a área rola na horizontal.
  const largura = larguraColuna(larguraArea, barras.length);
  const larguraBarra = Math.min(36, Math.max(14, Math.round(largura * 0.5)));

  return (
    <View style={estilos.cartao}>
      <View accessible accessibilityLabel={`${formatarNumero(atual.valor)} ${unidade} em ${formatarDataCurta(atual.data)}`}>
        <Text style={estilos.valorTopo}>
          {formatarNumero(atual.valor)}
          <Text style={estilos.unidade}>{ESPACO_FIXO}{unidade}</Text>
        </Text>
        <Text style={estilos.dataTopo}>{formatarDataCurta(atual.data)}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={(e: LayoutChangeEvent) => setLarguraArea(e.nativeEvent.layout.width)}
        testID="grafico-area"
      >
        <View style={[estilos.area, { minWidth: larguraArea }]}>
          {barras.map((barra, i) => {
            const ativa = i === indice;

            return (
              <Pressionavel
                key={barra.data}
                onPress={() => setSelecionada(i)}
                escala={0.94}
                haptico="leve"
                style={[estilos.coluna, { width: largura }]}
                accessibilityRole="button"
                accessibilityLabel={`${formatarDataCurta(barra.data)}: ${formatarNumero(barra.valor)}`}
              >
                <View
                  style={[
                    estilos.barra,
                    { width: larguraBarra, height: Math.max(6, barra.proporcao * ALTURA_MAXIMA) },
                    ativa ? estilos.barraAtiva : estilos.barraInativa,
                  ]}
                />
                <Text style={[estilos.data, ativa && estilos.dataAtiva]}>{formatarDataCurta(barra.data)}</Text>
              </Pressionavel>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raios.cartao,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 20,
  },
  valorTopo: { ...tipografia.numero, color: cores.primaria, fontSize: 40, lineHeight: 46 },
  unidade: { color: cores.textoSecundario, fontSize: 15, fontWeight: '600' },
  dataTopo: { color: cores.textoSecundario, fontSize: 13, marginTop: 2, marginBottom: 20 },
  area: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cores.bordaForte,
    minHeight: ALTURA_MAXIMA + 8,
    paddingBottom: 0,
  },
  coluna: { alignItems: 'center', justifyContent: 'flex-end' },
  barra: { borderTopLeftRadius: 8, borderTopRightRadius: 8, borderRadius: 8 },
  barraAtiva: { backgroundColor: cores.primaria },
  barraInativa: { backgroundColor: cores.primariaPressionada, opacity: 0.45 },
  data: { color: cores.textoTerciario, fontSize: 11, marginTop: 8, marginBottom: 6 },
  dataAtiva: { color: cores.texto },
  vazio: { color: cores.textoSecundario, fontSize: 14, textAlign: 'center', paddingVertical: 20 },
});
