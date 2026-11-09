import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Cartao } from '@/components/ui/Cartao';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { Selo } from '@/components/ui/Selo';
import { cores } from '@/theme';
import { AvaliacaoResposta } from '@/types/avaliacao.types';
import { formatarData } from '@/utils/datas';
import { avaliacoesRecentesPrimeiro } from '@/utils/indicadoresFisicos';
import { formatarAltura, formatarDecimal, formatarNumeroBr } from '@/utils/numeros';

export interface ListaAvaliacoesProps {
  avaliacoes: AvaliacaoResposta[];
  /** Avaliação com o detalhe expandido (estado na tela, para sobreviver à troca Treinos/Corpo). */
  aberta: number | null;
  aoAlternar: (id: number | null) => void;
}

const AUSENTE = '—';

function pesoTexto(a: AvaliacaoResposta): string {
  return `${formatarNumeroBr(a.peso)} kg`;
}

function gorduraTexto(a: AvaliacaoResposta): string | null {
  return a.percentual_gordura != null ? `${formatarNumeroBr(a.percentual_gordura)}%` : null;
}

/**
 * Histórico das avaliações em lista compacta: uma linha por avaliação (data, peso, IMC, gordura).
 * Tocar na linha expande o detalhe (todas as medidas, altura e observação); uma por vez.
 */
export function ListaAvaliacoes({ avaliacoes, aberta, aoAlternar }: ListaAvaliacoesProps) {
  const lista = avaliacoesRecentesPrimeiro(avaliacoes);

  return (
    <Cartao semPadding>
      {lista.map((avaliacao, indice) => {
        const expandida = aberta === avaliacao.id;
        const gordura = gorduraTexto(avaliacao);

        return (
          <View
            key={avaliacao.id}
            style={indice < lista.length - 1 ? estilos.separador : null}
            testID={`avaliacao-${avaliacao.id}`}
          >
            <Pressionavel
              onPress={() => aoAlternar(expandida ? null : avaliacao.id)}
              haptico="leve"
              escala={1}
              accessibilityRole="button"
              accessibilityState={{ expanded: expandida }}
              accessibilityLabel={
                `Avaliação de ${formatarData(avaliacao.data_avaliacao)}${indice === 0 ? ', a mais recente' : ''}: ` +
                `peso ${pesoTexto(avaliacao)}, IMC ${formatarDecimal(avaliacao.imc, 2)}, ` +
                `gordura ${gordura ?? 'não registrada'}`
              }
              style={estilos.linha}
              testID={`avaliacao-${avaliacao.id}-linha`}
            >
              <View style={estilos.textos}>
                <View style={estilos.topo}>
                  <Text style={estilos.data}>{formatarData(avaliacao.data_avaliacao)}</Text>
                  {indice === 0 ? <Selo rotulo="Mais recente" tom="primario" /> : null}
                </View>
                <Text style={estilos.resumo}>
                  <Text style={estilos.valor}>{pesoTexto(avaliacao)}</Text>
                  {'  ·  IMC '}
                  <Text style={estilos.valor}>{formatarDecimal(avaliacao.imc, 2)}</Text>
                  {'  ·  Gordura '}
                  {gordura ? <Text style={estilos.valor}>{gordura}</Text> : <Text style={estilos.ausente}>{AUSENTE}</Text>}
                </Text>
              </View>
              <Ionicons name={expandida ? 'chevron-up' : 'chevron-down'} size={18} color={cores.textoSecundario} />
            </Pressionavel>

            {expandida ? (
              <View style={estilos.detalhe} testID={`avaliacao-${avaliacao.id}-detalhe`}>
                <Item rotulo="Peso" valor={pesoTexto(avaliacao)} />
                <Item rotulo="IMC" valor={formatarDecimal(avaliacao.imc, 2)} />
                <Item rotulo="Gordura" valor={gordura} />
                <Item
                  rotulo="Massa muscular"
                  valor={avaliacao.massa_muscular != null ? `${formatarNumeroBr(avaliacao.massa_muscular)} kg` : null}
                />
                <Item rotulo="Altura" valor={formatarAltura(avaliacao.altura)} />
                {avaliacao.observacao ? <Text style={estilos.observacao}>{avaliacao.observacao}</Text> : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </Cartao>
  );
}

function Item({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <View style={estilos.item} accessible accessibilityLabel={`${rotulo}: ${valor ?? 'não registrado'}`}>
      <Text style={estilos.itemRotulo}>{rotulo}</Text>
      {valor ? <Text style={estilos.itemValor}>{valor}</Text> : <Text style={estilos.ausente}>{AUSENTE}</Text>}
    </View>
  );
}

const estilos = StyleSheet.create({
  separador: { borderBottomWidth: 1, borderBottomColor: cores.borda },
  linha: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  textos: { flex: 1, gap: 4 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  data: { color: cores.texto, fontSize: 15, fontWeight: '700' },
  resumo: { color: cores.textoSecundario, fontSize: 13 },
  valor: { color: cores.texto, fontWeight: '700' },
  ausente: { color: cores.textoTerciario, fontSize: 13 },
  detalhe: { paddingHorizontal: 16, paddingBottom: 14, gap: 6 },
  item: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  itemRotulo: { color: cores.textoSecundario, fontSize: 14 },
  itemValor: { color: cores.texto, fontSize: 14, fontWeight: '600' },
  observacao: { color: cores.texto, fontSize: 14, marginTop: 6 },
});
