import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BlocoEstatistica } from '@/components/ui/BlocoEstatistica';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { Cartao } from '@/components/ui/Cartao';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useSessaoDetalhe } from '@/hooks/useSessaoDetalhe';
import { cores, tipografia } from '@/theme';
import { formatarData, formatarHora, formatarNumero } from '@/utils/evolucao';
import {
  duracaoSessaoMin,
  formatarDuracao,
  totalSeries,
  volumeExecucoes,
} from '@/utils/historicoAluno';
import { formatarVolume } from '@/utils/painelAluno';
import { comUnidade } from '@/utils/pluralizacao';
import { agruparPorExercicio } from '@/utils/sessao';

export default function DetalheSessao() {
  const { sessaoId } = useLocalSearchParams<{ sessaoId: string }>();
  const { sessao, carregando, erro, recarregar } = useSessaoDetalhe(Number(sessaoId));

  const grupos = agruparPorExercicio(sessao?.execucoes ?? []);

  return (
    <Tela>
      <CabecalhoDetalhe titulo={sessao?.treino_nome ?? 'Sessão'} />

      {carregando ? (
        <View style={estilos.skeleton}>
          <Skeleton altura={120} raio={18} />
          <Skeleton altura={110} raio={18} />
        </View>
      ) : erro ? (
        <EstadoErro mensagem={erro} aoTentarNovamente={recarregar} />
      ) : !sessao ? (
        <EstadoVazio icone="alert-circle-outline" titulo="Sessão não encontrada" />
      ) : (
        <>
          <Text style={estilos.data}>
            {formatarData(sessao.iniciada_em)} às {formatarHora(sessao.iniciada_em)}
          </Text>

          <Cartao style={estilos.resumo} elevado>
            <BlocoEstatistica valor={formatarDuracao(duracaoSessaoMin(sessao))} rotulo="Duração" destaque />
            <BlocoEstatistica valor={totalSeries(sessao.execucoes)} rotulo="Séries" />
            <BlocoEstatistica
              valor={formatarVolume(volumeExecucoes(sessao.execucoes))}
              unidade="kg"
              rotulo="Volume"
            />
          </Cartao>

          {sessao.esforco !== null && (
            <Text style={estilos.esforco}>Esforço percebido: {sessao.esforco}/10</Text>
          )}
          {!!sessao.comentario && <Text style={estilos.comentario}>“{sessao.comentario}”</Text>}

          <TituloSecao titulo="Exercícios" />

          {grupos.length === 0 && (
            <EstadoVazio icone="barbell-outline" titulo="Nenhuma série registrada nesta sessão." />
          )}

          {grupos.map((grupo) => (
            <Cartao key={grupo.exercicioId} style={estilos.card}>
              <Text style={estilos.nome}>{grupo.exercicioNome}</Text>
              {grupo.execucoes.map((execucao, i) => (
                <View key={execucao.id} style={estilos.linha}>
                  <Text style={estilos.numero}>{i + 1}</Text>
                  <Text style={estilos.serie}>
                    {execucao.repeticoes_realizadas} reps · {comUnidade(formatarNumero(execucao.carga_utilizada), 'kg')}
                  </Text>
                </View>
              ))}
            </Cartao>
          ))}
        </>
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  skeleton: { gap: 12 },
  data: { color: cores.textoSecundario, fontSize: 14, marginBottom: 16 },
  resumo: { flexDirection: 'row', gap: 12 },
  esforco: { color: cores.textoSecundario, fontSize: 14, marginTop: 16 },
  comentario: { color: cores.texto, fontSize: 15, fontStyle: 'italic', marginTop: 8 },
  card: { marginBottom: 12 },
  nome: { color: cores.primaria, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  numero: {
    width: 26,
    textAlign: 'center',
    ...tipografia.numero,
    color: cores.textoSecundario,
    fontSize: 14,
  },
  serie: { color: cores.texto, fontSize: 15 },
});
