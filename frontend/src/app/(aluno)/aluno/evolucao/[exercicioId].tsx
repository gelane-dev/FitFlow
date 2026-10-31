import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Segmentado } from '@/components/aluno/Segmentado';
import { GraficoEvolucao } from '@/components/GraficoEvolucao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { HeroGradiente } from '@/components/ui/HeroGradiente';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useEvolucaoExercicio } from '@/hooks/useEvolucaoExercicio';
import { cores, tipografia } from '@/theme';
import { MetricaEvolucao } from '@/types/evolucao.types';
import { formatarData, formatarNumero } from '@/utils/evolucao';
import { recordePessoal } from '@/utils/historicoAluno';
import { ESPACO_FIXO } from '@/utils/pluralizacao';

const METRICAS: { valor: MetricaEvolucao; rotulo: string }[] = [
  { valor: 'carga_maxima', rotulo: 'Carga' },
  { valor: 'volume', rotulo: 'Volume' },
];

export default function EvolucaoExercicioAluno() {
  const { exercicioId } = useLocalSearchParams<{ exercicioId: string }>();
  const { evolucao, carregando, erro, recarregar } = useEvolucaoExercicio(Number(exercicioId));
  const [metrica, setMetrica] = useState<MetricaEvolucao>('carga_maxima');

  const pontos = evolucao?.pontos ?? [];
  const recorde = recordePessoal(pontos);

  return (
    <Tela>
      <CabecalhoDetalhe titulo={evolucao?.nome ?? 'Evolução'} />

      {carregando ? (
        <View style={estilos.skeleton}>
          <Skeleton altura={130} raio={28} />
          <Skeleton altura={40} raio={14} />
          <Skeleton altura={260} raio={18} />
        </View>
      ) : erro ? (
        <EstadoErro mensagem={erro} aoTentarNovamente={recarregar} />
      ) : !evolucao || pontos.length === 0 ? (
        <EstadoVazio icone="trending-up-outline" titulo="Sem registros para este exercício." />
      ) : (
        <>
          {recorde && (
            <HeroGradiente testID="recorde-pessoal">
              <View style={estilos.recordeTopo}>
                <Ionicons name="trophy" size={18} color={cores.sobrePrimaria} />
                <Text style={estilos.recordeRotulo}>Recorde pessoal</Text>
              </View>
              <Text style={estilos.recordeValor}>
                {formatarNumero(recorde.carga)}
                <Text style={estilos.recordeUnidade}>{ESPACO_FIXO}kg</Text>
              </Text>
              <Text style={estilos.recordeData}>em {formatarData(recorde.data)}</Text>
            </HeroGradiente>
          )}

          <TituloSecao titulo="Progressão" />
          <Segmentado opcoes={METRICAS} valor={metrica} onChange={setMetrica} />
          <View style={estilos.grafico}>
            <GraficoEvolucao pontos={pontos} metrica={metrica} />
          </View>
        </>
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  skeleton: { gap: 16 },
  recordeTopo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordeRotulo: {
    color: cores.sobrePrimaria,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  recordeValor: {
    ...tipografia.numero,
    color: cores.sobrePrimaria,
    fontSize: 48,
    lineHeight: 56,
    marginTop: 8,
  },
  recordeUnidade: { fontSize: 18, fontWeight: '700' },
  recordeData: { color: cores.sobrePrimaria, fontSize: 14, fontWeight: '600', opacity: 0.8 },
  grafico: { marginTop: 16 },
});
