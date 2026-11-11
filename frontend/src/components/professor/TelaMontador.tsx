import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BibliotecaMontador } from '@/components/professor/BibliotecaMontador';
import { DadosFichaMontador } from '@/components/professor/DadosFichaMontador';
import { EditorDivisao } from '@/components/professor/EditorDivisao';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { Cartao } from '@/components/ui/Cartao';
import { Chip } from '@/components/ui/Chip';
import { ConteudoLargo } from '@/components/ui/ConteudoLargo';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { Modal } from '@/components/ui/Modal';
import { SkeletonLista } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { useLarguraTela } from '@/components/ui/useLarguraTela';
import { useAlertaErro } from '@/hooks/useAlertaErro';
import { useAlunos } from '@/hooks/useAlunos';
import { useAvisoSaidaSemSalvar } from '@/hooks/useAvisoSaidaSemSalvar';
import { useMontadorFicha } from '@/hooks/useMontadorFicha';
import { cores } from '@/theme';
import { mostrarAlerta } from '@/utils/alerta';
import {
  ErrosMontador,
  primeiraDivisaoComErro,
  temErrosMontador,
  totalExercicios,
  validarMontador,
} from '@/utils/montadorFicha';

interface TelaMontadorProps {
  /** Ficha existente (edição); `null` = nova. */
  fichaId: number | null;
  /** Aluno pré-selecionado (ex.: vindo do detalhe do aluno). */
  alunoIdInicial?: number | null;
}

/** Altura máxima da biblioteca de exercícios ao lado do montador (layout largo). */
const ALTURA_MAXIMA_BIBLIOTECA = 640;

const SEM_ERROS: ErrosMontador = { divisoes: [] };

/**
 * Montador de fichas (/fichas/montar e /fichas/[id]/montar): dados, divisões A/B/C com exercícios
 * da biblioteca, rascunho e publicação. Em tela larga a biblioteca fica num painel ao lado; no
 * celular abre em folha modal. Nada é enviado até "Salvar"/"Publicar".
 */
export function TelaMontador({ fichaId, alunoIdInicial = null }: TelaMontadorProps) {
  const { ehLargo } = useLarguraTela();
  const montador = useMontadorFicha({ fichaId, alunoIdInicial });
  const { ficha, salvando, alterado } = montador;
  const { alunos, carregando: carregandoAlunos, erro: erroAlunos } = useAlunos();
  const { liberarSaida } = useAvisoSaidaSemSalvar(alterado);

  const [selecionada, setSelecionada] = useState(0);
  const [bibliotecaAberta, setBibliotecaAberta] = useState(false);
  const [tentou, setTentou] = useState<'salvar' | 'publicar' | null>(null);

  useAlertaErro(erroAlunos);

  // Ficha nova: `?alunoId=` de quem não é aluno vinculado a este professor é ignorado.
  const { descartarAlunoInicial } = montador;

  useEffect(() => {
    if (fichaId || !alunoIdInicial || carregandoAlunos || erroAlunos) {
      return;
    }

    if (!alunos.some((a) => a.id === alunoIdInicial)) {
      descartarAlunoInicial(alunoIdInicial);
    }
  }, [fichaId, alunoIdInicial, alunos, carregandoAlunos, erroAlunos, descartarAlunoInicial]);

  const indice = Math.min(selecionada, Math.max(ficha.divisoes.length - 1, 0));
  const divisao = ficha.divisoes[indice];

  // Erros ao vivo depois da primeira tentativa (mesmo padrão dos outros formulários).
  const erros = useMemo(
    () => (tentou ? validarMontador(ficha, { exigirExercicios: tentou === 'publicar' }) : SEM_ERROS),
    [ficha, tentou]
  );

  const usados = useMemo(() => {
    const mapa: Record<number, number> = {};

    for (const item of divisao?.itens ?? []) {
      mapa[item.exercicioId] = (mapa[item.exercicioId] ?? 0) + 1;
    }

    return mapa;
  }, [divisao]);

  const publicada = ficha.status === 'publicada' && Boolean(ficha.id);

  function irParaEdicao(id: number) {
    liberarSaida();
    router.replace({ pathname: '/fichas/[id]/montar' as any, params: { id: String(id) } });
  }

  function irParaFicha(id: number) {
    liberarSaida();
    router.replace({ pathname: '/fichas/[id]' as any, params: { id: String(id) } });
  }

  function avisarInvalido(motivo: 'salvar' | 'publicar') {
    const todos = validarMontador(ficha, { exigirExercicios: motivo === 'publicar' });
    const primeira = primeiraDivisaoComErro(todos);

    if (primeira !== null) {
      setSelecionada(primeira);
    }

    mostrarAlerta('Revise a ficha', todos.geral ?? 'Corrija os campos destacados antes de continuar.');
  }

  async function salvar() {
    setTentou('salvar');

    const resultado = await montador.salvarRascunho();

    if (!resultado.ok) {
      if (resultado.invalido) {
        avisarInvalido('salvar');
      } else {
        mostrarAlerta('Não foi possível salvar', resultado.erro);
      }

      return;
    }

    setTentou(null);

    const titulo = publicada ? 'Alterações salvas' : 'Rascunho salvo';
    const mensagem = publicada
      ? 'A ficha publicada foi atualizada ao salvar: o aluno já vê estas alterações (elas são aplicadas passo a passo, então evite fechar durante o salvamento). Use "Publicar" para registrar uma nova versão no histórico.'
      : 'O aluno ainda não vê esta ficha. Publique quando estiver pronta.';

    if (!fichaId) {
      mostrarAlerta(titulo, mensagem, [{ text: 'OK', onPress: () => irParaEdicao(resultado.fichaId) }]);

      return;
    }

    mostrarAlerta(titulo, mensagem);
  }

  function confirmarPublicacao() {
    setTentou('publicar');

    const encontrados = validarMontador(ficha, { exigirExercicios: true });

    if (temErrosMontador(encontrados)) {
      avisarInvalido('publicar');

      return;
    }

    const aluno = alunos.find((a) => a.id === ficha.alunoId)?.nome ?? 'o aluno';

    mostrarAlerta(
      publicada ? 'Publicar nova versão' : 'Publicar ficha',
      `${aluno} passará a ver "${ficha.nome.trim()}" com ${totalExercicios(ficha)} exercício(s). ` +
        'Será criada uma nova versão no histórico da ficha.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Publicar', onPress: publicar },
      ]
    );
  }

  async function publicar() {
    const resultado = await montador.publicar();

    if (!resultado.ok) {
      if (resultado.invalido) {
        avisarInvalido('publicar');
      } else {
        mostrarAlerta('Não foi possível publicar', resultado.erro);
      }

      return;
    }

    setTentou(null);
    mostrarAlerta(
      'Ficha publicada',
      `Versão ${resultado.versao ?? ''} criada. O aluno já pode ver a ficha.`.replace('  ', ' '),
      [
        {
          text: 'Continuar editando',
          style: 'cancel',
          onPress: () => {
            if (!fichaId) {
              irParaEdicao(resultado.fichaId);
            }
          },
        },
        { text: 'Ver ficha', onPress: () => irParaFicha(resultado.fichaId) },
      ]
    );
  }

  function confirmarRemoverDivisao() {
    if (!divisao) {
      return;
    }

    const remover = () => {
      montador.removerDivisao(indice);
      setSelecionada(Math.max(0, indice - 1));
    };

    if (divisao.itens.length === 0 && !divisao.id) {
      remover();

      return;
    }

    mostrarAlerta(
      'Remover divisão',
      `Remover "${divisao.nome}" e seus ${divisao.itens.length} exercício(s)? A remoção só vale depois de salvar.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: remover },
      ]
    );
  }

  function confirmarRemoverItem(posicao: number) {
    const item = divisao?.itens[posicao];

    if (!item) {
      return;
    }

    mostrarAlerta('Remover exercício', `Remover "${item.nome}" desta divisão?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => montador.removerItem(indice, posicao) },
    ]);
  }

  if (montador.carregando) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Montar ficha" />
        <SkeletonLista linhas={4} />
      </Tela>
    );
  }

  if (montador.erroCarga) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Montar ficha" />
        <EstadoErro mensagem={montador.erroCarga} aoTentarNovamente={montador.recarregar} />
      </Tela>
    );
  }

  const biblioteca = (
    <BibliotecaMontador
      aoAdicionar={(exercicio) => montador.adicionarExercicio(indice, exercicio)}
      usados={usados}
      alturaMaxima={ehLargo ? ALTURA_MAXIMA_BIBLIOTECA : undefined}
    />
  );

  const rodape = (
    <View>
      <Text style={estilos.resumo} accessibilityLiveRegion="polite" testID="montador-resumo">
        {ficha.divisoes.length} divisão(ões) · {totalExercicios(ficha)} exercício(s)
        {alterado ? ' · alterações não salvas' : ''}
      </Text>
      <View style={estilos.botoes}>
        <View style={estilos.botao}>
          <Botao
            variante="secundario"
            icone="save-outline"
            onPress={salvar}
            carregando={salvando}
            disabled={salvando}
            testID="montador-salvar"
          >
            {publicada ? 'Salvar alterações' : 'Salvar rascunho'}
          </Botao>
        </View>
        <View style={estilos.botao}>
          <Botao
            icone="rocket-outline"
            onPress={confirmarPublicacao}
            disabled={salvando}
            testID="montador-publicar"
          >
            {publicada ? 'Publicar nova versão' : 'Publicar'}
          </Botao>
        </View>
      </View>
    </View>
  );

  return (
    <Tela teclado rodape={rodape}>
      <CabecalhoDetalhe titulo={fichaId ? 'Editar ficha' : 'Montar ficha'} />

      <ConteudoLargo larguraMaxima={1400}>
        <DadosFichaMontador
          ficha={ficha}
          alunos={alunos}
          carregandoAlunos={carregandoAlunos}
          erros={erros}
          desabilitado={salvando}
          aoAlterar={montador.definirCampos}
        />

        {publicada ? (
          <Text style={estilos.aviso} testID="montador-aviso-publicada">
            Esta ficha já está publicada. “Salvar alterações” atualiza o que o aluno vê agora;
            “Publicar nova versão” também registra uma versão no histórico.
          </Text>
        ) : null}

        <View style={[estilos.corpo, ehLargo && estilos.corpoLargo]}>
          <View style={estilos.principal}>
            <Text style={estilos.secao}>DIVISÕES</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={estilos.abas}
              accessibilityLabel="Divisões da ficha"
            >
              {ficha.divisoes.map((d, i) => (
                <Chip
                  key={d.chave}
                  rotulo={`${d.nome.trim() || `Divisão ${i + 1}`} (${d.itens.length})`}
                  papel="radio"
                  selecionado={i === indice}
                  onPress={() => setSelecionada(i)}
                  testID={`divisao-aba-${i}`}
                />
              ))}
              <Chip
                rotulo="+ Divisão"
                icone="add"
                onPress={() => {
                  montador.adicionarDivisao();
                  setSelecionada(ficha.divisoes.length);
                }}
                testID="divisao-adicionar"
              />
            </ScrollView>

            {divisao ? (
              <EditorDivisao
                divisao={divisao}
                indice={indice}
                totalDivisoes={ficha.divisoes.length}
                erroNome={erros.divisoes[indice]?.nome}
                errosItens={erros.divisoes[indice]?.itens ?? []}
                desabilitado={salvando}
                mostrarBotaoBiblioteca={!ehLargo}
                aoAbrirBiblioteca={() => setBibliotecaAberta(true)}
                aoAlterarDivisao={(mudancas) => montador.atualizarDivisao(indice, mudancas)}
                aoMoverDivisao={(direcao) => {
                  montador.moverDivisao(indice, direcao);
                  setSelecionada(indice + direcao);
                }}
                aoDuplicarDivisao={() => {
                  montador.duplicarDivisao(indice);
                  setSelecionada(indice + 1);
                }}
                aoRemoverDivisao={confirmarRemoverDivisao}
                aoAlterarItem={(posicao, mudancas) => montador.atualizarItem(indice, posicao, mudancas)}
                aoMoverItem={(posicao, direcao) => montador.moverItem(indice, posicao, direcao)}
                aoDuplicarItem={(posicao) => montador.duplicarItem(indice, posicao)}
                aoRemoverItem={confirmarRemoverItem}
              />
            ) : null}
          </View>

          {ehLargo ? (
            <View style={estilos.lateral}>
              <Cartao>
                <Text style={estilos.secao}>BIBLIOTECA DE EXERCÍCIOS</Text>
                {biblioteca}
              </Cartao>
            </View>
          ) : null}
        </View>
      </ConteudoLargo>

      {!ehLargo ? (
        <Modal
          visivel={bibliotecaAberta}
          titulo={`Adicionar a ${divisao?.nome.trim() || 'divisão'}`}
          aoFechar={() => setBibliotecaAberta(false)}
          testID="modal-biblioteca"
        >
          {biblioteca}
        </Modal>
      ) : null}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  corpo: { gap: 16, marginTop: 8 },
  corpoLargo: { flexDirection: 'row', alignItems: 'flex-start' },
  principal: { flex: 3, minWidth: 0 },
  lateral: { flex: 2, minWidth: 360, maxWidth: 480 },
  secao: {
    color: cores.textoTerciario,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 16,
    marginBottom: 12,
  },
  abas: { gap: 8, paddingBottom: 12, paddingRight: 8, alignItems: 'center' },
  aviso: { color: cores.textoSecundario, fontSize: 13, lineHeight: 19, marginTop: 12 },
  resumo: { color: cores.textoSecundario, fontSize: 12, marginBottom: 8 },
  botoes: { flexDirection: 'row', gap: 12 },
  botao: { flex: 1 },
});
