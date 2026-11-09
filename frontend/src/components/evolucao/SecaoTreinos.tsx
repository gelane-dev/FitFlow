import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Segmentado } from '@/components/aluno/Segmentado';
import { EstadoErroSecao } from '@/components/ui/EstadoErroSecao';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { Skeleton, SkeletonLista } from '@/components/ui/Skeleton';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { cores } from '@/theme';
import { EvolucaoExercicio, EvolucaoExercicioResumo, MetricaTreino, PeriodoEvolucao } from '@/types/evolucao.types';
import { formatarData } from '@/utils/datas';
import { formatarDataCurta } from '@/utils/evolucao';
import { METRICAS_TREINO, pontosDaMetrica, progressoDoPeriodo } from '@/utils/progressoEvolucao';
import {
  formatarDiferenca,
  formatarPercentual,
  setaDaVariacao,
  tomDaVariacao,
} from '@/utils/variacaoEvolucao';

import { CartaoEvolucao } from './CartaoEvolucao';
import { ComparacaoValores, textoValor } from './ComparacaoValores';
import { GraficoLinha } from './GraficoLinha';
import { HistoricoDesempenho } from './HistoricoDesempenho';
import { IndicadoresLado } from './IndicadoresLado';
import { SeletorExercicio } from './SeletorExercicio';
import { SeletorPeriodo } from './SeletorPeriodo';

export interface SecaoTreinosProps {
  /** Lista de exercícios com histórico (hook `useEvolucaoLista`). */
  exercicios: EvolucaoExercicioResumo[];
  carregandoLista: boolean;
  erroLista: string | null;
  aoTentarNovamenteLista: () => void;
  /** Exercício efetivamente exibido (o primeiro da lista, se o aluno ainda não escolheu). */
  exercicioId: number | null;
  aoEscolherExercicio: (exercicio: EvolucaoExercicioResumo) => void;
  periodo: PeriodoEvolucao | null;
  aoMudarPeriodo: (periodo: PeriodoEvolucao | null) => void;
  /** Estado do hook `useDesempenhoExercicio`. */
  evolucao: EvolucaoExercicio | null;
  carregandoDesempenho: boolean;
  erroDesempenho: string | null;
  aoTentarNovamenteDesempenho: () => void;
  /** Métrica exibida (estado na tela, para sobreviver à troca Treinos/Corpo). */
  metrica: MetricaTreino;
  aoMudarMetrica: (metrica: MetricaTreino) => void;
}

const ROTULO_METRICA: Record<MetricaTreino, string> = {
  carga_maxima: 'Carga máxima',
  repeticoes_maximas: 'Repetições máximas',
  volume: 'Volume',
};

/** Lado "Treinos": seletor de exercício e um cartão com valor atual, métrica, período e gráfico. */
const aoVerDetalhe = (id: number) => router.push(`/aluno/evolucao/${id}`);

export function SecaoTreinos({
  exercicios,
  carregandoLista,
  erroLista,
  aoTentarNovamenteLista,
  exercicioId,
  aoEscolherExercicio,
  periodo,
  aoMudarPeriodo,
  evolucao,
  carregandoDesempenho,
  erroDesempenho,
  aoTentarNovamenteDesempenho,
  metrica,
  aoMudarMetrica,
}: SecaoTreinosProps) {
  return (
    <View testID="secao-treinos" style={estilos.secao}>
      {carregandoLista ? (
        <SkeletonLista linhas={3} />
      ) : erroLista ? (
        <EstadoErroSecao mensagem={erroLista} aoTentarNovamente={aoTentarNovamenteLista} testID="erro-treinos" />
      ) : exercicios.length === 0 ? (
        <EstadoVazio
          icone="trending-up-outline"
          titulo="Sem evolução ainda"
          descricao="Registre treinos para acompanhar sua evolução."
          acaoRotulo="Ver meus treinos"
          aoAcionar={() => router.navigate('/aluno/treinos')}
        />
      ) : (
        <>
          <SeletorExercicio exercicios={exercicios} selecionadoId={exercicioId} onSelecionar={aoEscolherExercicio} />

          <CartaoEvolucao
            cabecalho={
              <Cabecalho
                evolucao={evolucao}
                metrica={metrica}
                carregando={carregandoDesempenho}
                comErro={erroDesempenho !== null}
              />
            }
          >
            <Segmentado opcoes={METRICAS_TREINO} valor={metrica} onChange={aoMudarMetrica} compacto />
            <SeletorPeriodo valor={periodo} onChange={aoMudarPeriodo} />

            {carregandoDesempenho ? (
              <View testID="desempenho-carregando">
                <Skeleton altura={200} raio={14} />
              </View>
            ) : erroDesempenho ? (
              <EstadoErroSecao
                mensagem={erroDesempenho}
                aoTentarNovamente={aoTentarNovamenteDesempenho}
                testID="erro-desempenho"
              />
            ) : evolucao ? (
              <Grafico evolucao={evolucao} metrica={metrica} />
            ) : null}
          </CartaoEvolucao>

          {!carregandoDesempenho && !erroDesempenho && evolucao && exercicioId !== null ? (
            <>
              <Indicadores evolucao={evolucao} metrica={metrica} />
              <TituloSecao titulo="Histórico de desempenho" />
              <HistoricoDesempenho
                pontos={evolucao.pontos}
                exercicioId={exercicioId}
                aoVerDetalhe={aoVerDetalhe}
              />
            </>
          ) : exercicioId !== null && !carregandoDesempenho ? (
            // Falha na busca de desempenho: o atalho para o histórico completo continua disponível.
            <HistoricoDesempenho pontos={[]} exercicioId={exercicioId} aoVerDetalhe={aoVerDetalhe} />
          ) : null}
        </>
      )}
    </View>
  );
}

function dadosDaMetrica(metrica: MetricaTreino) {
  return METRICAS_TREINO.find((m) => m.valor === metrica) ?? METRICAS_TREINO[0];
}

interface CabecalhoProps {
  evolucao: EvolucaoExercicio | null;
  metrica: MetricaTreino;
  carregando: boolean;
  comErro: boolean;
}

/** Valor atual e variação × anterior do exercício (sempre sobre todo o histórico). */
function Cabecalho({ evolucao, metrica, carregando, comErro }: CabecalhoProps) {
  if (carregando) {
    return <Skeleton altura={72} raio={14} />;
  }

  const comparacao = evolucao?.comparacao ?? null;

  if (comErro || !comparacao) {
    return null;
  }

  const dados = dadosDaMetrica(metrica);

  return (
    <ComparacaoValores
      rotulo={ROTULO_METRICA[metrica]}
      atual={{ valor: comparacao.atual[metrica], data: comparacao.atual.data }}
      anterior={comparacao.anterior ? { valor: comparacao.anterior[metrica], data: comparacao.anterior.data } : null}
      unidade={dados.unidade}
      direcao="alta"
      semAnterior="Primeiro registro"
      legendaVariacao="vs. treino anterior"
      testID="comparacao-treino"
    />
  );
}

function Grafico({ evolucao, metrica }: { evolucao: EvolucaoExercicio; metrica: MetricaTreino }) {
  const dados = dadosDaMetrica(metrica);
  const pontos = pontosDaMetrica(evolucao.pontos, metrica);

  if (pontos.length === 0) {
    return (
      <View testID="desempenho-vazio">
        <GraficoLinha
          pontos={[]}
          rotulo={dados.rotulo}
          unidade={dados.unidade}
          mensagemVazio="Sem registros neste período. Escolha um período maior para ver seu histórico."
          embutido
          testID="grafico-treino"
        />
      </View>
    );
  }

  return <GraficoLinha pontos={pontos} rotulo={dados.rotulo} unidade={dados.unidade} embutido testID="grafico-treino" />;
}

/** "No período" (primeiro × último ponto) e "Último × anterior" (valor de referência), lado a lado. */
function Indicadores({ evolucao, metrica }: { evolucao: EvolucaoExercicio; metrica: MetricaTreino }) {
  const dados = dadosDaMetrica(metrica);
  const progresso = progressoDoPeriodo(pontosDaMetrica(evolucao.pontos, metrica));
  const comparacao = evolucao.comparacao ?? null;
  const anterior = comparacao?.anterior ?? null;

  const tom = progresso ? tomDaVariacao(progresso.variacao, 'alta') : 'neutro';
  const corProgresso = tom === 'favoravel' ? cores.sucesso : tom === 'desfavoravel' ? cores.perigo : cores.textoSecundario;

  const textoProgresso = progresso
    ? `${setaDaVariacao(progresso.variacao)} ${formatarDiferenca(progresso.variacao.absoluta, dados.unidade)}` +
      (progresso.variacao.percentual !== null ? ` (${formatarPercentual(progresso.variacao.percentual)})` : '')
    : '—';

  return (
    <IndicadoresLado
      itens={[
        {
          rotulo: 'No período',
          valor: textoProgresso,
          cor: progresso ? corProgresso : undefined,
          detalhe: progresso
            ? `${formatarDataCurta(progresso.inicial.data)} → ${formatarDataCurta(progresso.final.data)}`
            : 'Menos de 2 registros',
          accessibilityLabel: progresso
            ? `No período: de ${textoValor(progresso.inicial.valor, dados.unidade)} em ${formatarData(progresso.inicial.data)} ` +
              `para ${textoValor(progresso.final.valor, dados.unidade)} em ${formatarData(progresso.final.data)}, ` +
              `variação ${formatarDiferenca(progresso.variacao.absoluta, dados.unidade)}`
            : 'No período: menos de 2 registros para comparar',
          testID: progresso ? 'progresso-periodo' : 'progresso-periodo-vazio',
        },
        {
          rotulo: 'Treino anterior',
          valor: anterior ? textoValor(anterior[metrica], dados.unidade) : '—',
          detalhe: anterior ? formatarDataCurta(anterior.data) : 'Primeiro registro',
          accessibilityLabel: anterior
            ? `Treino anterior: ${textoValor(anterior[metrica], dados.unidade)} em ${formatarData(anterior.data)}`
            : 'Sem treino anterior',
          testID: 'comparacao-treino-anterior',
        },
      ]}
    />
  );
}

const estilos = StyleSheet.create({
  secao: { gap: 12 },
});
