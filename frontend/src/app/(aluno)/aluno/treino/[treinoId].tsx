import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';

import { CampoSerie } from '@/components/aluno/CampoSerie';
import {
  LinhaExercicioTreino,
  ListaExerciciosTreino,
} from '@/components/aluno/ListaExerciciosTreino';
import { ResumoTreino } from '@/components/aluno/ResumoTreino';
import { CronometroDescanso } from '@/components/CronometroDescanso';
import { VideoPlayerExercicio } from '@/components/exercicios/VideoPlayerExercicio';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { Selo } from '@/components/ui/Selo';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { tocarHaptico } from '@/components/ui/haptics';
import { useAlertaErro } from '@/hooks/useAlertaErro';
import { useCronometro } from '@/hooks/useCronometro';
import { useSessaoExecucao } from '@/hooks/useSessaoExecucao';
import { cores, fonteDisplay, raios } from '@/theme';
import { mostrarAlerta } from '@/utils/alerta';
import { formatarNumero } from '@/utils/evolucao';
import { formatarDuracao } from '@/utils/historicoAluno';
import { formatarVolume } from '@/utils/painelAluno';
import { ajustarCampo, minutosDesde, volumeDasSeries } from '@/utils/sessao';

const PASSO_REPETICOES = 1;
const PASSO_CARGA = 2.5;

/** Execução do treino em modo foco: um exercício por vez, série a série, com descanso e resumo final. */
export default function ExecucaoTreino() {
  const { treinoId } = useLocalSearchParams<{ treinoId: string }>();
  const {
    iniciadaEm,
    treinoNome,
    itens,
    series,
    totalSeries,
    seriesFeitas,
    carregando,
    erro,
    erroAcao,
    enviando,
    finalizando,
    editarSerie,
    concluirSerie,
    finalizar,
    recarregar,
  } = useSessaoExecucao(Number(treinoId));
  const cronometro = useCronometro();

  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [descansoTotal, setDescansoTotal] = useState(0);
  const [resumo, setResumo] = useState(false);
  const [duracaoMin, setDuracaoMin] = useState(1);
  const [esforco, setEsforco] = useState<number | undefined>(undefined);
  const [comentario, setComentario] = useState('');

  useAlertaErro(erro ?? erroAcao);

  // Séries de cada exercício, na ordem, e o primeiro exercício com série pendente.
  const exercicios = itens.map((item) => {
    const chaves = Array.from({ length: item.series }, (_, i) => `${item.id}-${i}`).filter(
      (chave) => series[chave]
    );
    const feitas = chaves.filter((chave) => series[chave].feita).length;

    return { item, chaves, feitas };
  });
  const primeiroPendente = exercicios.findIndex((e) => e.feitas < e.chaves.length);
  const indice = Math.min(
    selecionado ?? (primeiroPendente >= 0 ? primeiroPendente : Math.max(0, exercicios.length - 1)),
    Math.max(0, exercicios.length - 1)
  );
  const atual = exercicios[indice];
  const chaveAtual = atual?.chaves.find((chave) => !series[chave].feita);
  const serieAtual = chaveAtual ? series[chaveAtual] : undefined;
  const exercicioConcluido = !!atual && atual.chaves.length > 0 && !chaveAtual;
  const ultimoExercicio = indice >= exercicios.length - 1;
  const treinoCompleto = totalSeries > 0 && seriesFeitas >= totalSeries;
  const progresso = totalSeries > 0 ? seriesFeitas / totalSeries : 0;

  const linhas: LinhaExercicioTreino[] = exercicios.map((e, i) => ({
    id: e.item.id,
    nome: e.item.nome ?? `Exercício ${e.item.exercicio_id}`,
    feitas: e.feitas,
    total: e.chaves.length,
    estado: e.feitas >= e.chaves.length && e.chaves.length > 0 ? 'feito' : i === indice ? 'atual' : 'pendente',
  }));

  async function aoConcluirSerie() {
    if (!atual || !chaveAtual) {
      return;
    }

    const gravou = await concluirSerie(chaveAtual);

    if (!gravou) {
      return;
    }

    tocarHaptico('sucesso');

    // Última série do treino: vai direto ao resumo, sem descanso.
    if (seriesFeitas + 1 >= totalSeries) {
      abrirResumo();
      return;
    }

    setDescansoTotal(atual.item.descanso);
    cronometro.iniciar(atual.item.descanso);
  }

  function abrirResumo() {
    // Mesma base do histórico: início da sessão no servidor, mesmo após sair e retomar (I-02).
    setDuracaoMin(iniciadaEm ? minutosDesde(iniciadaEm) : 1);
    setResumo(true);
  }

  function voltar() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/aluno');
    }
  }

  /** Com séries feitas e treino não finalizado, pede confirmação antes de sair (P-15). */
  function aoSair() {
    if (seriesFeitas === 0) {
      voltar();

      return;
    }

    mostrarAlerta('Sair do treino?', 'Seu progresso fica salvo e você pode continuar depois.', [
      { text: 'Continuar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: voltar },
    ]);
  }

  // Botão voltar do Android: mesma confirmação; no resumo, volta ao treino.
  useEffect(() => {
    const inscricao = BackHandler.addEventListener('hardwareBackPress', () => {
      if (resumo) {
        setResumo(false);

        return true;
      }

      if (seriesFeitas > 0) {
        aoSair();

        return true;
      }

      return false;
    });

    return () => inscricao.remove();
  });

  function aoPular() {
    cronometro.pular();
  }

  function irPara(novo: number) {
    if (novo >= 0 && novo < exercicios.length) {
      setSelecionado(novo);
    }
  }

  async function aoFinalizar() {
    const finalizou = await finalizar(esforco, comentario);

    if (finalizou) {
      tocarHaptico('sucesso');
      router.replace('/aluno');
    }
  }

  function aoAcaoPrincipal() {
    if (!exercicioConcluido) {
      void aoConcluirSerie();
    } else if (ultimoExercicio || treinoCompleto) {
      abrirResumo();
    } else {
      setSelecionado(indice + 1);
    }
  }

  const textoAcao = !exercicioConcluido
    ? 'Concluir série'
    : ultimoExercicio || treinoCompleto
      ? 'Finalizar treino'
      : 'Próximo exercício';

  if (carregando || erro || itens.length === 0) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo={treinoNome || 'Treino'} />
        {carregando ? (
          <View style={estilos.skeleton}>
            <Skeleton altura={8} raio={4} />
            <Skeleton altura={220} raio={18} />
            <Skeleton altura={84} raio={18} />
          </View>
        ) : erro ? (
          <EstadoErro mensagem={erro} aoTentarNovamente={recarregar} />
        ) : (
          <EstadoVazio icone="barbell-outline" titulo="Este treino não tem exercícios." />
        )}
      </Tela>
    );
  }

  if (resumo) {
    return (
      <Tela teclado>
        <CabecalhoDetalhe titulo="Resumo" aoVoltar={() => setResumo(false)} />
        <ResumoTreino
          treinoNome={treinoNome}
          duracao={formatarDuracao(duracaoMin)}
          series={`${seriesFeitas}/${totalSeries}`}
          volume={formatarVolume(volumeDasSeries(series))}
          incompleto={!treinoCompleto}
          esforco={esforco}
          onEsforco={setEsforco}
          comentario={comentario}
          onComentario={setComentario}
          finalizando={finalizando}
          onFinalizar={aoFinalizar}
          onVoltar={() => setResumo(false)}
        />
      </Tela>
    );
  }

  const item = atual.item;

  return (
    <View style={estilos.raiz}>
      <Tela
        teclado
        rodape={
          <Botao
            icone={exercicioConcluido ? 'arrow-forward' : 'checkmark'}
            onPress={aoAcaoPrincipal}
            carregando={enviando !== null}
            haptico
            testID="botao-concluir-serie"
          >
            {textoAcao}
          </Botao>
        }
      >
        <CabecalhoDetalhe titulo={treinoNome || 'Treino'} aoVoltar={aoSair} />

        <View style={estilos.progresso}>
          <View style={estilos.trilho}>
            <View style={[estilos.preenchimento, { width: `${Math.round(progresso * 100)}%` }]} />
          </View>
          <Text style={estilos.progressoTexto}>
            {seriesFeitas} de {totalSeries} séries concluídas
          </Text>
        </View>

        {item.video ? (
          <VideoPlayerExercicio uri={item.video} />
        ) : item.imagem ? (
          <Image source={{ uri: item.imagem }} style={estilos.midia} contentFit="cover" />
        ) : (
          <View style={[estilos.midia, estilos.semMidia]}>
            <Ionicons name="barbell-outline" size={56} color={cores.textoTerciario} />
          </View>
        )}

        <View style={estilos.titulo}>
          <Text style={estilos.nome}>{item.nome ?? `Exercício ${item.exercicio_id}`}</Text>
          {!!item.grupo_muscular && <Selo rotulo={item.grupo_muscular} tom="neutro" />}
        </View>

        {exercicioConcluido ? (
          <View style={estilos.concluido} testID="exercicio-concluido">
            <Ionicons name="checkmark-circle" size={28} color={cores.sucesso} />
            <Text style={estilos.concluidoTexto}>Exercício concluído</Text>
          </View>
        ) : (
          <>
            <Text style={estilos.serie} testID="serie-atual">
              Série {(serieAtual?.indice ?? 0) + 1} de {atual.chaves.length}
            </Text>
            <Text style={estilos.alvo}>
              Alvo: {item.repeticoes} reps · {formatarNumero(item.carga)} kg
            </Text>

            {chaveAtual && serieAtual && (
              <View style={estilos.campos}>
                <CampoSerie
                  rotulo="Reps"
                  valor={serieAtual.repeticoes}
                  onChange={(v) => editarSerie(chaveAtual, 'repeticoes', v)}
                  onMenos={() =>
                    editarSerie(chaveAtual, 'repeticoes', ajustarCampo(serieAtual.repeticoes, -PASSO_REPETICOES))
                  }
                  onMais={() =>
                    editarSerie(chaveAtual, 'repeticoes', ajustarCampo(serieAtual.repeticoes, PASSO_REPETICOES))
                  }
                  editavel={enviando === null}
                  teclado="number-pad"
                  testID="campo-reps"
                />
                <CampoSerie
                  rotulo="Carga (kg)"
                  valor={serieAtual.carga}
                  onChange={(v) => editarSerie(chaveAtual, 'carga', v)}
                  onMenos={() => editarSerie(chaveAtual, 'carga', ajustarCampo(serieAtual.carga, -PASSO_CARGA))}
                  onMais={() => editarSerie(chaveAtual, 'carga', ajustarCampo(serieAtual.carga, PASSO_CARGA))}
                  editavel={enviando === null}
                  teclado="decimal-pad"
                  testID="campo-carga"
                />
              </View>
            )}
          </>
        )}

        <View style={estilos.navegacao}>
          <View style={estilos.navBotao}>
            <Botao
              variante="secundario"
              tamanho="medio"
              icone="chevron-back"
              disabled={indice === 0}
              onPress={() => irPara(indice - 1)}
              testID="exercicio-anterior"
            >
              Anterior
            </Botao>
          </View>
          <View style={estilos.navBotao}>
            <Botao
              variante="secundario"
              tamanho="medio"
              icone="chevron-forward"
              disabled={ultimoExercicio}
              onPress={() => irPara(indice + 1)}
              testID="exercicio-proximo"
            >
              Próximo
            </Botao>
          </View>
        </View>

        <Text style={estilos.secao}>Exercícios do treino</Text>
        <ListaExerciciosTreino linhas={linhas} onSelecionar={setSelecionado} />

        <View style={estilos.finalizarManual}>
          <Botao
            variante="fantasma"
            tamanho="medio"
            onPress={abrirResumo}
            testID="botao-finalizar-treino"
          >
            Finalizar treino
          </Botao>
        </View>
      </Tela>

      {cronometro.ativo && (
        <CronometroDescanso
          restante={cronometro.restante}
          pausado={cronometro.pausado}
          total={descansoTotal}
          onPausar={cronometro.pausar}
          onRetomar={cronometro.retomar}
          onAdicionar={() => {
            setDescansoTotal((t) => t + 15);
            cronometro.adicionar(15);
          }}
          onPular={aoPular}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.fundo },
  skeleton: { gap: 16 },
  progresso: { marginBottom: 20 },
  trilho: {
    height: 6,
    borderRadius: raios.pilula,
    backgroundColor: cores.superficieElevada,
    overflow: 'hidden',
  },
  preenchimento: { height: 6, borderRadius: raios.pilula, backgroundColor: cores.primaria },
  progressoTexto: { color: cores.textoSecundario, fontSize: 13, marginTop: 8 },
  midia: {
    width: '100%',
    height: 220,
    borderRadius: raios.cartao,
    backgroundColor: cores.superficie,
  },
  semMidia: { alignItems: 'center', justifyContent: 'center' },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  nome: { flex: 1, color: cores.texto, fontFamily: fonteDisplay, fontSize: 24, lineHeight: 30 },
  serie: { color: cores.primaria, fontSize: 22, fontWeight: '800', marginTop: 16 },
  alvo: { color: cores.textoSecundario, fontSize: 15, marginTop: 4 },
  campos: { flexDirection: 'row', gap: 12, marginTop: 20 },
  concluido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    padding: 16,
    borderRadius: raios.cartao,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.sucesso,
  },
  concluidoTexto: { color: cores.texto, fontSize: 17, fontWeight: '700' },
  navegacao: { flexDirection: 'row', gap: 12, marginTop: 20 },
  navBotao: { flex: 1 },
  secao: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 32,
    marginBottom: 8,
  },
  finalizarManual: { marginTop: 16 },
});
