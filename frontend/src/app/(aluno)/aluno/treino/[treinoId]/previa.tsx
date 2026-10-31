import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PreviaTreino } from '@/components/aluno/PreviaTreino';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { useMinhasFichaCompleta } from '@/hooks/useMinhasFichaCompleta';
import { useMinhasSessoes } from '@/hooks/useMinhasSessoes';
import { sessaoAberta } from '@/utils/painelAluno';
import { rotaExecucaoTreino } from '@/utils/rotas';

/**
 * Pré-visualização do treino (/aluno/treino/[treinoId]/previa?fichaId=): mostra os exercícios
 * antes de começar, sem criar sessão. A execução continua em /aluno/treino/[treinoId].
 */
export default function PreviaTreinoAluno() {
  const { treinoId, fichaId } = useLocalSearchParams<{ treinoId: string; fichaId?: string }>();
  const { ficha, carregando, erro, recarregar } = useMinhasFichaCompleta(
    fichaId ? Number(fichaId) : null
  );

  const sessoes = useMinhasSessoes();
  const emAndamento = !!sessaoAberta(sessoes.sessoes, Number(treinoId));

  const treino = ficha?.treinos.find((t) => t.id === Number(treinoId));

  function comecar() {
    // `replace`: a execução ocupa o lugar da prévia na pilha (voltar leva à tela de origem).
    router.replace(rotaExecucaoTreino(Number(treinoId)));
  }

  return (
    <Tela
      rodape={
        treino && treino.itens.length > 0 ? (
          <Botao icone="play" onPress={comecar} haptico testID="botao-iniciar-treino">
            {emAndamento ? 'Continuar treino' : 'Começar treino'}
          </Botao>
        ) : undefined
      }
    >
      <CabecalhoDetalhe titulo="Treino" />

      {carregando ? (
        <View style={estilos.skeleton}>
          <Skeleton largura="40%" altura={14} />
          <Skeleton largura="70%" altura={34} />
          <Skeleton altura={84} raio={18} />
          <Skeleton altura={68} />
          <Skeleton altura={68} />
        </View>
      ) : erro ? (
        <EstadoErro mensagem={erro} aoTentarNovamente={recarregar} />
      ) : !treino ? (
        <EstadoVazio icone="alert-circle-outline" titulo="Treino não encontrado" />
      ) : treino.itens.length === 0 ? (
        <EstadoVazio icone="barbell-outline" titulo="Este treino não tem exercícios." />
      ) : (
        <PreviaTreino treino={treino} />
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  skeleton: { gap: 16 },
});
