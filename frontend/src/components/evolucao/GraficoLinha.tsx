import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { Pressionavel } from '@/components/ui/Pressionavel';
import { cores, raios, tipografia } from '@/theme';
import {
  AreaGrafico,
  calcularEscalaY,
  caminhoDaLinha,
  deslocamentoInicial,
  folgaFinal,
  larguraDoGrafico,
  PontoGrafico,
  posicaoRotuloX,
  posicaoY,
  posicionarPontos,
  rotulosDoEixoX,
} from '@/utils/graficoLinha';
import { formatarData } from '@/utils/datas';
import { formatarNumeroBr } from '@/utils/numeros';
import { ESPACO_FIXO } from '@/utils/pluralizacao';

export interface GraficoLinhaProps {
  /** Pontos em ordem crescente de data. O componente não sabe se é exercício ou avaliação. */
  pontos: PontoGrafico[];
  /** Nome do que está sendo medido (ex.: "Carga", "Peso"): entra no resumo de acessibilidade. */
  rotulo: string;
  /** Unidade exibida junto do valor; vazio para grandezas sem unidade (IMC). */
  unidade?: string;
  /** Texto do estado vazio. */
  mensagemVazio?: string;
  /**
   * Dentro de outro cartão: sem moldura própria. O valor do ponto mais recente já está no cabeçalho
   * do cartão, então a leitura só aparece quando o usuário toca em outro ponto.
   */
  embutido?: boolean;
  testID?: string;
}

const ALTURA = 168;
const LARGURA_EIXO = 40;
const ALVO_TOQUE = 44;
const AREA_VERTICAL = { topo: 16, base: 16 };
const RAIO_PONTO = 4;
const RAIO_SELECIONADO = 7;

function textoValor(valor: number, unidade: string): string {
  const numero = formatarNumeroBr(valor);

  return unidade ? `${numero}${ESPACO_FIXO}${unidade}` : numero;
}

/**
 * Gráfico de linha genérico (react-native-svg, ADR-032). Eixo Y derivado dos dados (sem zero
 * forçado), um ponto só mostra o ponto sem linha, lista vazia mostra estado vazio. Tocar num ponto
 * mostra valor e data (padrão: o mais recente); cada ponto tem alvo de toque de 44 pt e, com muitos
 * pontos, a área rola na horizontal.
 */
export function GraficoLinha({
  pontos,
  rotulo,
  unidade = '',
  mensagemVazio = 'Sem registros para exibir.',
  embutido = false,
  testID = 'grafico-linha',
}: GraficoLinhaProps) {
  const [larguraDisponivel, setLarguraDisponivel] = useState(0);
  const [escolha, setEscolha] = useState<{ assinatura: string; indice: number } | null>(null);
  const rolagem = useRef<ScrollView>(null);
  const usuarioRolou = useRef(false);

  const escala = calcularEscalaY(pontos.map((p) => p.valor));
  const quantidadePontos = pontos.length;
  const assinatura = pontos.map((p) => `${p.data}:${p.valor}`).join('|');

  // Série nova: volta a acompanhar o ponto mais recente (fim da rolagem) até o usuário rolar.
  useEffect(() => {
    usuarioRolou.current = false;
  }, [assinatura]);

  // Série nova ou largura medida: posiciona no ponto mais recente até o usuário rolar. A largura
  // medida pode mudar sem mudar o tamanho do conteúdo, então onContentSizeChange não basta.
  useEffect(() => {
    if (!usuarioRolou.current) {
      rolagem.current?.scrollTo({
        x: deslocamentoInicial(larguraDisponivel, quantidadePontos, ALVO_TOQUE),
        animated: false,
      });
    }
  }, [assinatura, larguraDisponivel, quantidadePontos]);

  if (pontos.length === 0 || escala === null) {
    return (
      <View style={[estilos.vazio, embutido && estilos.vazioEmbutido]} testID={`${testID}-vazio`}>
        <Text style={estilos.vazioTexto}>{mensagemVazio}</Text>
      </View>
    );
  }

  // A escolha vale só para a série em que foi feita; outra série volta ao ponto mais recente.
  const ultimo = pontos.length - 1;
  const indice =
    escolha && escolha.assinatura === assinatura && escolha.indice <= ultimo ? escolha.indice : ultimo;
  const selecionado = pontos[indice];

  const largura = larguraDoGrafico(larguraDisponivel, pontos.length, ALVO_TOQUE);
  const area: AreaGrafico = {
    largura,
    altura: ALTURA,
    ...AREA_VERTICAL,
    esquerda: ALVO_TOQUE / 2,
    direita: ALVO_TOQUE / 2,
  };
  const posicionados = posicionarPontos(pontos, escala, area);
  const linha = caminhoDaLinha(posicionados);
  const rotulosX = rotulosDoEixoX(pontos);
  const valores = pontos.map((p) => p.valor);
  const resumo =
    `${rotulo}: ${pontos.length} ${pontos.length === 1 ? 'registro' : 'registros'}, ` +
    `de ${formatarData(pontos[0].data)} a ${formatarData(pontos[ultimo].data)}. ` +
    `Mínimo ${textoValor(Math.min(...valores), unidade)}, máximo ${textoValor(Math.max(...valores), unidade)}. ` +
    `Selecionado: ${textoValor(selecionado.valor, unidade)} em ${formatarData(selecionado.data)}.`;

  return (
    <View style={embutido ? estilos.embutido : estilos.cartao} testID={testID}>
      <View accessible accessibilityLabel={resumo} testID={`${testID}-resumo`}>
        {embutido && indice === ultimo ? (
          <Text style={estilos.dica}>Toque em um ponto para ver o valor e a data</Text>
        ) : (
          <>
            <Text style={embutido ? estilos.valorEmbutido : estilos.valorTopo} testID={`${testID}-valor`}>
              {formatarNumeroBr(selecionado.valor)}
              {unidade ? <Text style={estilos.unidade}>{ESPACO_FIXO}{unidade}</Text> : null}
            </Text>
            <Text style={estilos.dataTopo} testID={`${testID}-data`}>
              {formatarData(selecionado.data)}
            </Text>
          </>
        )}
      </View>

      <View style={estilos.corpo}>
        <View style={[estilos.eixo, { height: ALTURA }]} importantForAccessibility="no-hide-descendants">
          {escala.marcas.map((marca) => (
            <Text
              key={marca}
              style={[estilos.marca, { top: posicaoY(marca, escala, area) - 8 }]}
              numberOfLines={1}
            >
              {formatarNumeroBr(marca)}
            </Text>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={estilos.rolagem}
          ref={rolagem}
          onScrollBeginDrag={() => {
            usuarioRolou.current = true;
          }}
          onContentSizeChange={() => {
            // Largura medida ou série nova: o ponto mais recente (à direita) precisa estar visível.
            if (!usuarioRolou.current) {
              rolagem.current?.scrollTo({
                x: deslocamentoInicial(larguraDisponivel, quantidadePontos, ALVO_TOQUE),
                animated: false,
              });
            }
          }}
          onLayout={(e: LayoutChangeEvent) => setLarguraDisponivel(Math.floor(e.nativeEvent.layout.width))}
          testID={`${testID}-area`}
        >
          <View style={{ width: largura + folgaFinal(larguraDisponivel, quantidadePontos, ALVO_TOQUE) }}>
            <View style={{ height: ALTURA }}>
              {/* importantForAccessibility fica no View: no <Svg> ele vazaria para o DOM na web. */}
              <View importantForAccessibility="no-hide-descendants">
              <Svg width={largura} height={ALTURA}>
                {escala.marcas.map((marca) => {
                  const y = posicaoY(marca, escala, area);

                  return (
                    <Line
                      key={marca}
                      x1={0}
                      x2={largura}
                      y1={y}
                      y2={y}
                      stroke={cores.borda}
                      strokeWidth={1}
                    />
                  );
                })}
                {linha ? (
                  <Polyline
                    points={linha}
                    fill="none"
                    stroke={cores.primaria}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ) : null}
                {posicionados.map((p, i) =>
                  i === indice ? (
                    <Circle
                      key={`${p.data}-${i}`}
                      cx={p.x}
                      cy={p.y}
                      r={RAIO_SELECIONADO}
                      fill={cores.primaria}
                      stroke={cores.texto}
                      strokeWidth={2}
                    />
                  ) : (
                    <Circle
                      key={`${p.data}-${i}`}
                      cx={p.x}
                      cy={p.y}
                      r={RAIO_PONTO}
                      fill={cores.fundo}
                      stroke={cores.primaria}
                      strokeWidth={2}
                    />
                  )
                )}
              </Svg>
              </View>

              {posicionados.map((p, i) => (
                <Pressionavel
                  key={`alvo-${p.data}-${i}`}
                  onPress={() => setEscolha({ assinatura, indice: i })}
                  haptico="leve"
                  escala={1}
                  testID={`${testID}-ponto-${i}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${textoValor(p.valor, unidade)} em ${formatarData(p.data)}`}
                  accessibilityState={{ selected: i === indice }}
                  style={[
                    estilos.alvo,
                    { left: p.x - ALVO_TOQUE / 2, top: Math.min(Math.max(p.y - ALVO_TOQUE / 2, 0), ALTURA - ALVO_TOQUE) },
                  ]}
                />
              ))}
            </View>

            <View style={[estilos.datas, { width: largura }]} importantForAccessibility="no-hide-descendants">
              {posicionados.map((p, i) => (
                <Text
                  key={`data-${p.data}-${i}`}
                  style={[
                    estilos.dataEixo,
                    i === indice && estilos.dataEixoAtiva,
                    { left: posicaoRotuloX(p.x, ALVO_TOQUE, largura) },
                  ]}
                  numberOfLines={1}
                >
                  {rotulosX[i]}
                </Text>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raios.cartao,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 16,
    gap: 12,
  },
  embutido: { gap: 12 },
  valorEmbutido: { ...tipografia.numero, color: cores.texto, fontSize: 20, lineHeight: 26 },
  dica: { color: cores.textoTerciario, fontSize: 12 },
  vazioEmbutido: { borderWidth: 0, padding: 8 },
  valorTopo: { ...tipografia.numero, color: cores.texto, fontSize: 32, lineHeight: 38 },
  unidade: { ...tipografia.numero, color: cores.textoSecundario, fontSize: 15 },
  dataTopo: { color: cores.textoSecundario, fontSize: 13 },
  corpo: { flexDirection: 'row' },
  eixo: { width: LARGURA_EIXO },
  marca: {
    ...tipografia.numero,
    position: 'absolute',
    left: 0,
    width: LARGURA_EIXO - 6,
    height: 16,
    color: cores.textoTerciario,
    fontSize: 11,
    fontWeight: '600',
  },
  rolagem: { flex: 1 },
  alvo: { position: 'absolute', width: ALVO_TOQUE, height: ALVO_TOQUE },
  datas: { height: 24, marginTop: 4 },
  dataEixo: {
    position: 'absolute',
    top: 0,
    width: ALVO_TOQUE,
    textAlign: 'center',
    color: cores.textoTerciario,
    fontSize: 11,
    fontWeight: '600',
  },
  dataEixoAtiva: { color: cores.primaria },
  vazio: {
    backgroundColor: cores.superficie,
    borderRadius: raios.cartao,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 24,
    alignItems: 'center',
  },
  vazioTexto: { color: cores.textoSecundario, fontSize: 14, textAlign: 'center' },
});
