import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AbasEvolucao, OpcaoAba } from '@/components/evolucao/AbasEvolucao';
import { ResumoEvolucao } from '@/components/evolucao/ResumoEvolucao';
import { SecaoCorpo } from '@/components/evolucao/SecaoCorpo';
import { SecaoTreinos } from '@/components/evolucao/SecaoTreinos';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { Tela } from '@/components/ui/Tela';
import { useDesempenhoExercicio } from '@/hooks/useDesempenhoExercicio';
import { useEvolucaoLista } from '@/hooks/useEvolucaoLista';
import { useMinhasAvaliacoes } from '@/hooks/useMinhasAvaliacoes';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { MetricaTreino, PeriodoEvolucao } from '@/types/evolucao.types';
import { ChaveIndicador } from '@/utils/indicadoresFisicos';

type Lado = 'treinos' | 'corpo';

const LADOS: OpcaoAba<Lado>[] = [
  { valor: 'treinos', rotulo: 'Treinos', icone: 'barbell-outline' },
  { valor: 'corpo', rotulo: 'Corpo', icone: 'body-outline' },
];

/**
 * Aba Evolução (/aluno/evolucao): resumo compacto e um alternador interno Treinos | Corpo (estado
 * local, sem rota nova; padrão Treinos). Cada lado tem carregamento, erro e vazio próprios.
 */
export default function EvolucaoAluno() {
  const lista = useEvolucaoLista();
  const avaliacoes = useMinhasAvaliacoes();

  const [lado, setLado] = useState<Lado>('treinos');
  const [escolhido, setEscolhido] = useState<number | null>(null);
  const [periodo, setPeriodo] = useState<PeriodoEvolucao | null>(null);
  // Estado dos dois lados fica aqui: alternar Treinos/Corpo desmonta o lado inativo, mas não perde a escolha.
  const [metrica, setMetrica] = useState<MetricaTreino>('carga_maxima');
  const [indicador, setIndicador] = useState<ChaveIndicador>('peso');
  const [avaliacaoAberta, setAvaliacaoAberta] = useState<number | null>(null);

  // Sem escolha (ou com um exercício que saiu da lista), vale o primeiro da lista.
  const exercicioId = lista.exercicios.some((e) => e.exercicio_id === escolhido)
    ? escolhido
    : (lista.exercicios[0]?.exercicio_id ?? null);
  const desempenho = useDesempenhoExercicio(exercicioId, periodo);

  const { recarregar: recarregarLista } = lista;
  const { recarregar: recarregarAvaliacoes } = avaliacoes;
  const { recarregar: recarregarDesempenho } = desempenho;

  async function recarregarTudo() {
    await Promise.all([recarregarLista(), recarregarAvaliacoes(), recarregarDesempenho()]);
  }

  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(recarregarTudo);

  useRecarregarNoFoco(recarregarTudo);

  return (
    <Tela abas testID="tela-evolucao" aoAtualizar={aoAtualizar} atualizando={atualizando}>
      <CabecalhoGrande rotulo="Sua força" titulo="Evolução" />

      <ResumoEvolucao
        exercicios={lista.carregando || lista.erro ? [] : lista.exercicios}
        avaliacoes={avaliacoes.carregando || avaliacoes.erro ? [] : avaliacoes.avaliacoes}
      />

      <View style={estilos.alternador}>
        <AbasEvolucao opcoes={LADOS} valor={lado} onChange={setLado} />
      </View>

      {lado === 'treinos' ? (
        <SecaoTreinos
          exercicios={lista.exercicios}
          carregandoLista={lista.carregando}
          erroLista={lista.erro}
          aoTentarNovamenteLista={recarregarLista}
          exercicioId={exercicioId}
          aoEscolherExercicio={(exercicio) => setEscolhido(exercicio.exercicio_id)}
          periodo={periodo}
          aoMudarPeriodo={setPeriodo}
          evolucao={desempenho.evolucao}
          carregandoDesempenho={desempenho.carregando}
          erroDesempenho={desempenho.erro}
          aoTentarNovamenteDesempenho={recarregarDesempenho}
          metrica={metrica}
          aoMudarMetrica={setMetrica}
        />
      ) : (
        <SecaoCorpo
          avaliacoes={avaliacoes.avaliacoes}
          carregando={avaliacoes.carregando}
          erro={avaliacoes.erro}
          aoTentarNovamente={recarregarAvaliacoes}
          indicador={indicador}
          aoMudarIndicador={setIndicador}
          avaliacaoAberta={avaliacaoAberta}
          aoAlternarAvaliacao={setAvaliacaoAberta}
        />
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  alternador: { marginTop: 20, marginBottom: 16 },
});
