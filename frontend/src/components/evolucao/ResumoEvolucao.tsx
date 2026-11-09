import { StyleSheet, Text, View } from 'react-native';

import { Cartao } from '@/components/ui/Cartao';
import { cores, tipografia } from '@/theme';
import { AvaliacaoResposta } from '@/types/avaliacao.types';
import { EvolucaoExercicioResumo } from '@/types/evolucao.types';
import { tendenciaDaCarga } from '@/utils/historicoAluno';
import { pontosDoIndicador } from '@/utils/indicadoresFisicos';
import { formatarNumeroBr } from '@/utils/numeros';

export interface ResumoEvolucaoProps {
  /** Lista já carregada; vazia enquanto carrega ou em erro (o indicador então não aparece). */
  exercicios: EvolucaoExercicioResumo[];
  avaliacoes: AvaliacaoResposta[];
}

interface Indicador {
  rotulo: string;
  valor: string;
  /** Texto lido por leitores de tela. */
  descricao: string;
  destaque?: boolean;
}

/**
 * Faixa compacta no topo da aba: até três indicadores com significado claro (exercícios
 * acompanhados, quantos estão com a carga em alta e o peso atual). Só dados reais: o indicador sem
 * dado não aparece, e sem nenhum a faixa some.
 */
export function ResumoEvolucao({ exercicios, avaliacoes }: ResumoEvolucaoProps) {
  const pesos = pontosDoIndicador(avaliacoes, 'peso');
  const pesoAtual = pesos.length > 0 ? pesos[pesos.length - 1].valor : null;
  const emAlta = exercicios.filter((e) => tendenciaDaCarga(e.ultima_carga, e.carga_maxima) === 'alta').length;

  const indicadores: Indicador[] = [];

  if (exercicios.length > 0) {
    indicadores.push({
      rotulo: exercicios.length === 1 ? 'Exercício' : 'Exercícios',
      valor: String(exercicios.length),
      descricao: `${exercicios.length} ${exercicios.length === 1 ? 'exercício acompanhado' : 'exercícios acompanhados'}`,
      destaque: true,
    });
    indicadores.push({
      rotulo: 'Cargas em alta',
      valor: `${emAlta} de ${exercicios.length}`,
      descricao: `${emAlta} de ${exercicios.length} exercícios com a carga em alta`,
    });
  }

  if (pesoAtual !== null) {
    indicadores.push({
      rotulo: 'Peso atual',
      valor: `${formatarNumeroBr(pesoAtual)} kg`,
      descricao: `Peso atual: ${formatarNumeroBr(pesoAtual)} kg`,
    });
  }

  if (indicadores.length === 0) {
    return null;
  }

  return (
    <View testID="resumo-evolucao">
      <Cartao>
        <View style={estilos.linha}>
          {indicadores.map((indicador) => (
            <View key={indicador.rotulo} style={estilos.celula} accessible accessibilityLabel={indicador.descricao}>
              <Text style={[estilos.valor, indicador.destaque && { color: cores.primaria }]} numberOfLines={1}>
                {indicador.valor}
              </Text>
              <Text style={estilos.rotulo}>{indicador.rotulo}</Text>
            </View>
          ))}
        </View>
      </Cartao>
    </View>
  );
}

const estilos = StyleSheet.create({
  // Numa linha só quando cabe; em tela muito estreita quebra em vez de truncar.
  linha: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 12 },
  celula: { flexBasis: 72, flexGrow: 1, flexShrink: 1, gap: 2 },
  valor: { ...tipografia.numero, color: cores.texto, fontSize: 20, lineHeight: 26 },
  rotulo: { color: cores.textoSecundario, fontSize: 12 },
});
