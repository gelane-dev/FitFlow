import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgTexto } from 'react-native-svg';

import { cores, fonteCorpo } from '@/theme';
import {
  abreviarRotulo,
  AreaBarras,
  calcularEscalaBarras,
  DadoBarra,
  mostrarRotuloNoIndice,
  OrientacaoBarras,
  passoRotulosEixo,
  posicionarBarras,
  resumirBarras,
} from '@/utils/graficoBarras';
import { formatarNumeroBr } from '@/utils/numeros';

export interface GraficoBarrasProps {
  dados: DadoBarra[];
  /** O que o gráfico mede (ex.: "Receita por mês"): entra no resumo de acessibilidade. */
  rotulo: string;
  orientacao?: OrientacaoBarras;
  /** Formata os valores nas barras e no eixo (padrão: número brasileiro). */
  formatarValor?: (valor: number) => string;
  altura?: number;
  mensagemVazio?: string;
  testID?: string;
}

const LARGURA_PADRAO = 320;
const ALTURA_PADRAO = 220;
const ALTURA_BARRA_HORIZONTAL = 40;
const MAX_ROTULO_VERTICAL = 8;
const MAX_ROTULO_HORIZONTAL = 14;

/**
 * Gráfico de barras vertical ou horizontal em SVG (sem dependência nova), com rótulos, valores
 * e resumo de acessibilidade. Valores negativos aparecem como barra vazia.
 */
export function GraficoBarras({
  dados,
  rotulo,
  orientacao = 'vertical',
  formatarValor = (valor) => formatarNumeroBr(valor),
  altura,
  mensagemVazio = 'Sem dados para exibir.',
  testID,
}: GraficoBarrasProps) {
  const [largura, setLargura] = useState(LARGURA_PADRAO);

  if (dados.length === 0) {
    return (
      <View style={estilos.vazio} testID={testID} accessibilityLabel={`${rotulo}: sem dados`}>
        <Text style={estilos.textoVazio}>{mensagemVazio}</Text>
      </View>
    );
  }

  const horizontal = orientacao === 'horizontal';
  const alturaTotal = altura ?? (horizontal ? dados.length * ALTURA_BARRA_HORIZONTAL + 16 : ALTURA_PADRAO);
  const area: AreaBarras = horizontal
    ? { largura, altura: alturaTotal, topo: 8, base: 8, esquerda: 110, direita: 70 }
    : { largura, altura: alturaTotal, topo: 28, base: 28, esquerda: 8, direita: 8 };

  const escala = calcularEscalaBarras(dados.map((d) => d.valor));
  const barras = posicionarBarras(dados, escala, area, orientacao);
  const baseY = area.altura - area.base;
  const maxRotulo = horizontal ? MAX_ROTULO_HORIZONTAL : MAX_ROTULO_VERTICAL;
  const maiorRotulo = Math.max(...dados.map((d) => Math.min(d.rotulo.length, maxRotulo)));
  const passo = horizontal
    ? 1
    : passoRotulosEixo(Math.max(0, largura - area.esquerda - area.direita) / dados.length, maiorRotulo);

  function aoMedir(evento: LayoutChangeEvent) {
    const nova = Math.round(evento.nativeEvent.layout.width);

    if (nova > 0 && nova !== largura) {
      setLargura(nova);
    }
  }

  return (
    <View
      onLayout={aoMedir}
      style={estilos.raiz}
      accessible
      accessibilityRole="image"
      accessibilityLabel={resumirBarras(rotulo, dados, formatarValor)}
      testID={testID}
    >
      <Svg width={largura} height={alturaTotal}>
        {horizontal ? (
          <Line x1={area.esquerda} y1={area.topo} x2={area.esquerda} y2={baseY} stroke={cores.bordaForte} strokeWidth={1} />
        ) : (
          <Line x1={area.esquerda} y1={baseY} x2={largura - area.direita} y2={baseY} stroke={cores.bordaForte} strokeWidth={1} />
        )}

        {barras.map((barra, indice) => (
          <G key={indice}>
            <Rect
              x={barra.x}
              y={barra.y}
              width={barra.largura}
              height={barra.altura}
              rx={4}
              fill={cores.primaria}
            />
            {mostrarRotuloNoIndice(indice, passo) ? (
            <SvgTexto
              x={barra.rotuloX}
              y={barra.rotuloY}
              fill={cores.textoSecundario}
              fontSize={11}
              fontFamily={fonteCorpo}
              textAnchor={horizontal ? 'end' : 'middle'}
            >
              {abreviarRotulo(barra.rotulo, maxRotulo)}
            </SvgTexto>
            ) : null}
            <SvgTexto
              x={barra.valorX}
              y={barra.valorY}
              fill={cores.texto}
              fontSize={11}
              fontFamily={fonteCorpo}
              fontWeight="700"
              textAnchor={horizontal ? 'start' : 'middle'}
            >
              {formatarValor(barra.valor)}
            </SvgTexto>
          </G>
        ))}
      </Svg>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { width: '100%' },
  vazio: { alignItems: 'center', paddingVertical: 32 },
  textoVazio: { color: cores.textoSecundario, fontSize: 14 },
});
