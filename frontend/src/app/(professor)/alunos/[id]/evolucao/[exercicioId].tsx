import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useLocalSearchParams } from 'expo-router';

import { GraficoEvolucao } from '@/components/GraficoEvolucao';
import { BlocoEstatistica } from '@/components/ui/BlocoEstatistica';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { Cartao } from '@/components/ui/Cartao';
import { Chip } from '@/components/ui/Chip';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useAlunoEvolucao } from '@/hooks/useAlunoEvolucao';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { cores, tipografia } from '@/theme';
import { MetricaEvolucao } from '@/types/evolucao.types';
import { formatarNumero } from '@/utils/evolucao';
import { paramTexto } from '@/utils/params';

const METRICAS: { chave: MetricaEvolucao; rotulo: string }[] = [
  { chave: 'carga_maxima', rotulo: 'Carga máxima (kg)' },
  { chave: 'volume', rotulo: 'Volume' },
];

/** Evolução de um exercício do aluno (/alunos/[id]/evolucao/[exercicioId]). */
export default function EvolucaoDoAluno() {
  const params = useLocalSearchParams();
  const alunoId = Number(paramTexto(params.id));
  const exercicioId = Number(paramTexto(params.exercicioId));

  const { evolucao, carregando, erro, recarregar } = useAlunoEvolucao(alunoId, exercicioId);
  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(recarregar);
  const [metrica, setMetrica] = useState<MetricaEvolucao>('carga_maxima');

  if (carregando && !evolucao) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Evolução" />
        <Skeleton altura={30} largura="70%" />
        <View style={estilos.espaco} />
        <Skeleton altura={220} raio={18} />
      </Tela>
    );
  }

  if (erro || !evolucao) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Evolução" />
        <EstadoErro mensagem={erro || 'Evolução não encontrada.'} aoTentarNovamente={recarregar} />
      </Tela>
    );
  }

  const maiorCarga = evolucao.pontos.reduce((max, p) => Math.max(max, p.carga_maxima), 0);
  const registros = evolucao.pontos.reduce((soma, p) => soma + p.registros, 0);

  return (
    <Tela aoAtualizar={aoAtualizar} atualizando={atualizando}>
      <CabecalhoDetalhe titulo="Evolução" />

      <Text style={estilos.nome}>{evolucao.nome}</Text>
      <Text style={estilos.subtitulo}>Evolução do aluno</Text>

      {evolucao.pontos.length === 0 ? (
        <EstadoVazio icone="trending-up" titulo="Sem registros para este exercício" />
      ) : (
        <>
          <View style={estilos.estatisticas}>
            <Cartao style={estilos.bloco}>
              <BlocoEstatistica valor={formatarNumero(maiorCarga)} unidade="kg" rotulo="Maior carga" destaque />
            </Cartao>
            <Cartao style={estilos.bloco}>
              <BlocoEstatistica valor={evolucao.pontos.length} rotulo="Dias treinados" />
            </Cartao>
            <Cartao style={estilos.bloco}>
              <BlocoEstatistica valor={registros} rotulo="Registros" />
            </Cartao>
          </View>

          <TituloSecao titulo="Métrica" />
          <View style={estilos.metricas}>
            {METRICAS.map(({ chave, rotulo }) => (
              <Chip
                key={chave}
                rotulo={rotulo}
                selecionado={metrica === chave}
                onPress={() => setMetrica(chave)}
              />
            ))}
          </View>

          <View style={estilos.grafico}>
            <GraficoEvolucao pontos={evolucao.pontos} metrica={metrica} />
          </View>
        </>
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  espaco: { height: 16 },
  nome: { ...tipografia.subtitulo, color: cores.texto, marginTop: 16 },
  subtitulo: { color: cores.textoSecundario, fontSize: 13, marginTop: 4, marginBottom: 20 },
  estatisticas: { flexDirection: 'row', gap: 10 },
  bloco: { flex: 1, paddingHorizontal: 10 },
  metricas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grafico: { marginTop: 16 },
});
