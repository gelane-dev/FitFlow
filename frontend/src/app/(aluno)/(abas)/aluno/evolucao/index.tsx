import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { LinhaLista } from '@/components/ui/LinhaLista';
import { SkeletonLista } from '@/components/ui/Skeleton';
import { TelaLista } from '@/components/ui/TelaLista';
import { useEvolucaoLista } from '@/hooks/useEvolucaoLista';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { cores, tipografia } from '@/theme';
import { formatarData, formatarNumero } from '@/utils/evolucao';
import { tendenciaDaCarga } from '@/utils/historicoAluno';
import { comUnidade } from '@/utils/pluralizacao';

/** Aba Evolução (/aluno/evolucao): exercícios com a tendência e a última carga (lista virtualizada). */
export default function EvolucaoAluno() {
  const { exercicios, carregando, erro, recarregar } = useEvolucaoLista();
  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(recarregar);

  useRecarregarNoFoco(recarregar);

  const vazio = carregando ? (
    <SkeletonLista linhas={5} />
  ) : erro ? (
    <EstadoErro mensagem={erro} aoTentarNovamente={recarregar} />
  ) : (
    <EstadoVazio
      icone="trending-up-outline"
      titulo="Sem evolução ainda"
      descricao="Registre treinos para acompanhar sua evolução."
      acaoRotulo="Ver meus treinos"
      aoAcionar={() => router.navigate('/aluno/treinos')}
    />
  );

  return (
    <TelaLista
      abas
      testID="tela-evolucao"
      cabecalho={<CabecalhoGrande rotulo="Sua força" titulo="Evolução" />}
      dados={carregando || erro ? [] : exercicios}
      chave={(exercicio) => String(exercicio.exercicio_id)}
      vazio={vazio}
      aoAtualizar={aoAtualizar}
      atualizando={atualizando}
      renderItem={({ item: exercicio, index }) => {
        const alta = tendenciaDaCarga(exercicio.ultima_carga, exercicio.carga_maxima) === 'alta';

        return (
          <LinhaLista
            titulo={exercicio.nome}
            subtitulo={`${exercicio.grupo_muscular} · máx. ${comUnidade(formatarNumero(exercicio.carga_maxima), 'kg')} · ${formatarData(exercicio.ultima_data)}`}
            icone="trending-up-outline"
            separador={index < exercicios.length - 1}
            onPress={() => router.push(`/aluno/evolucao/${exercicio.exercicio_id}`)}
            direita={
              <View style={estilos.tendencia} accessibilityLabel={alta ? 'Em alta' : 'Abaixo da carga máxima'}>
                <Text style={[estilos.seta, { color: alta ? cores.sucesso : cores.perigo }]}>
                  {alta ? '↑' : '↓'}
                </Text>
                <Text style={estilos.carga} numberOfLines={1}>
                  {comUnidade(formatarNumero(exercicio.ultima_carga), 'kg')}
                </Text>
              </View>
            }
          />
        );
      }}
    />
  );
}

const estilos = StyleSheet.create({
  // A coluna da direita não encolhe: o valor e a unidade ficam juntos numa linha só.
  tendencia: { alignItems: 'flex-end', flexShrink: 0 },
  seta: { fontSize: 18, fontWeight: '800', lineHeight: 20 },
  carga: { ...tipografia.numero, color: cores.texto, fontSize: 14 },
});
