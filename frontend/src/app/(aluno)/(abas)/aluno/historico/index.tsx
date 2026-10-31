import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CartaoSessao } from '@/components/aluno/CartaoSessao';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoErroSecao } from '@/components/ui/EstadoErroSecao';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { Skeleton } from '@/components/ui/Skeleton';
import { TelaSecoes } from '@/components/ui/TelaLista';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useHistoricoSessoes } from '@/hooks/useHistoricoSessoes';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { cores } from '@/theme';
import { SessaoResumo } from '@/types/sessao.types';
import { agruparSessoesPorMes } from '@/utils/historicoAluno';

/**
 * Aba Histórico (/aluno/historico): sessões agrupadas por mês, como um feed, com rolagem infinita
 * (páginas de 20 vindas da API) e lista virtualizada.
 */
export default function HistoricoAluno() {
  const { sessoes, carregando, carregandoMais, temMais, erro, erroMais, recarregar, carregarMais } =
    useHistoricoSessoes();
  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(recarregar);

  useRecarregarNoFoco(recarregar);

  const secoes = agruparSessoesPorMes(sessoes).map((grupo) => ({
    chave: grupo.chave,
    titulo: grupo.titulo,
    data: grupo.sessoes,
  }));

  let vazio = null;

  if (carregando) {
    vazio = (
      <View style={estilos.skeleton}>
        <Skeleton altura={132} raio={18} />
        <Skeleton altura={132} raio={18} />
        <Skeleton altura={132} raio={18} />
      </View>
    );
  } else if (erro) {
    vazio = <EstadoErro mensagem={erro} aoTentarNovamente={recarregar} />;
  } else {
    vazio = (
      <EstadoVazio
        icone="time-outline"
        titulo="Nenhum treino ainda"
        descricao="Você ainda não realizou nenhum treino."
        acaoRotulo="Ver meus treinos"
        aoAcionar={() => router.navigate('/aluno/treinos')}
      />
    );
  }

  const rodape = carregandoMais ? (
    <ActivityIndicator color={cores.primaria} style={estilos.carregandoMais} testID="historico-carregando-mais" />
  ) : erroMais ? (
    <EstadoErroSecao mensagem={erroMais} aoTentarNovamente={recarregar} />
  ) : null;

  return (
    <TelaSecoes<SessaoResumo, { chave: string; titulo: string }>
      abas
      testID="tela-historico"
      cabecalho={<CabecalhoGrande rotulo="Seus treinos" titulo="Histórico" />}
      secoes={secoes}
      chave={(sessao) => String(sessao.id)}
      renderSecao={({ section }) => <TituloSecao titulo={section.titulo} />}
      renderItem={({ item }) => (
        <CartaoSessao sessao={item} onPress={() => router.push(`/aluno/historico/${item.id}`)} />
      )}
      vazio={vazio}
      rodape={rodape}
      aoAtualizar={aoAtualizar}
      atualizando={atualizando}
      aoChegarAoFim={temMais ? carregarMais : undefined}
    />
  );
}

const estilos = StyleSheet.create({
  skeleton: { gap: 12 },
  carregandoMais: { paddingVertical: 20 },
});
