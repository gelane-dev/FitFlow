import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useLocalSearchParams } from 'expo-router';

import { CardItemTreino } from '@/components/CardItemTreino';
import { FormularioEdicaoItem } from '@/components/FormularioEdicaoItem';
import { FormularioRascunhoItem } from '@/components/FormularioRascunhoItem';
import { ModalSeletorExercicio } from '@/components/ModalSeletorExercicio';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { SkeletonLista } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { useAlertaErro } from '@/hooks/useAlertaErro';
import { useFicha } from '@/hooks/useFicha';
import { useGerenciarItemFicha } from '@/hooks/useGerenciarItemFicha';
import { useItemEdicao } from '@/hooks/useItemEdicao';
import { useItensTreino } from '@/hooks/useItensTreino';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { useTreinos } from '@/hooks/useTreinos';
import { cores, fonteDisplay } from '@/theme';
import { Exercicio } from '@/types/exercicio.types';
import { ItemFichaAtualizar, RascunhoItem } from '@/types/ficha.types';
import { mostrarAlerta } from '@/utils/alerta';
import { ordenarPorOrdem } from '@/utils/ordem';
import { subtituloTreino, tituloTelaTreino } from '@/utils/diasSemana';
import { lerCarga } from '@/utils/validacaoFormularios';
import { lerNumero } from '@/utils/vigencia';

function criarRascunho(): RascunhoItem {
  return {
    chave: `${Date.now()}-${Math.random()}`,
    exercicioId: null,
    exercicioNome: '',
    grupoMuscular: '',
    series: '3',
    repeticoes: '12',
    carga: '',
    descanso: '60',
  };
}

/** Montagem do treino (/fichas/[id]/treinos/[treinoId]): itens numerados, reordenação e novos exercícios. */
export default function MontagemTreino() {
  const { id, treinoId, nomeTreino } = useLocalSearchParams();
  const idFicha = Number(id);
  const idTreino = Number(treinoId);
  const { ficha } = useFicha(idFicha);
  const { treinos } = useTreinos(idFicha);
  const treino = treinos.find((t) => t.id === idTreino);
  // O nome atual vem da API; o parâmetro da rota cobre o primeiro render.
  const tituloTreino = treino?.nome ?? (typeof nomeTreino === 'string' ? nomeTreino : 'Montagem');

  const { itens, carregando, erro, recarregar } = useItensTreino(idTreino);
  const { criar, deletar, carregando: salvando, erro: erroGestao } = useGerenciarItemFicha();
  const {
    atualizar: atualizarItem,
    mover,
    carregando: editando,
    erro: erroEdicao,
  } = useItemEdicao();

  const [itemEmEdicao, setItemEmEdicao] = useState<number | null>(null);
  const [rascunhos, setRascunhos] = useState<RascunhoItem[]>([]);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [chaveSelecao, setChaveSelecao] = useState<string | null>(null);

  useAlertaErro(erroGestao);
  useAlertaErro(erroEdicao);

  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(recarregar);

  const itensOrdenados = ordenarPorOrdem(itens);

  async function salvarEdicao(idItem: number, dados: ItemFichaAtualizar) {
    const atualizado = await atualizarItem(idItem, dados);

    if (atualizado) {
      setItemEmEdicao(null);
    }

    // Recarrega também em caso de erro (ex.: 409) para refletir o servidor.
    await recarregar();
  }

  async function moverItem(indice: number, direcao: -1 | 1) {
    await mover(idTreino, itensOrdenados, indice, direcao);
    await recarregar();
  }

  function atualizarRascunho(chave: string, campo: keyof RascunhoItem, valor: string) {
    setRascunhos((atual) =>
      atual.map((item) => (item.chave === chave ? { ...item, [campo]: valor } : item))
    );
  }

  function abrirSeletor(chave: string) {
    setChaveSelecao(chave);
    setModalVisivel(true);
  }

  function escolherExercicio(exercicio: Exercicio) {
    if (!chaveSelecao) {
      return;
    }

    setRascunhos((atual) =>
      atual.map((item) =>
        item.chave === chaveSelecao
          ? {
              ...item,
              exercicioId: exercicio.id,
              exercicioNome: exercicio.nome,
              grupoMuscular: exercicio.grupo_muscular,
            }
          : item
      )
    );

    setModalVisivel(false);
    setChaveSelecao(null);
  }

  /** O formulário do rascunho já validou os campos antes de chamar. */
  async function salvarRascunho(rascunho: RascunhoItem) {
    if (!rascunho.exercicioId) {
      return;
    }

    const proximaOrdem = itens.length > 0 ? Math.max(...itens.map((i) => i.ordem)) + 1 : 1;

    const item = await criar({
      ficha_id: idFicha,
      treino_id: idTreino,
      exercicio_id: rascunho.exercicioId,
      series: lerNumero(rascunho.series),
      repeticoes: lerNumero(rascunho.repeticoes),
      carga: lerCarga(rascunho.carga),
      descanso: lerNumero(rascunho.descanso),
      ordem: proximaOrdem,
    });

    if (item === 'rede') {
      // A falha pode ter vindo depois de o servidor gravar: confere a lista antes de deixar reenviar.
      const atualizados = await recarregar();
      const jaExiste = atualizados?.some((i) => i.exercicio_id === rascunho.exercicioId);

      if (jaExiste) {
        setRascunhos((atual) => atual.filter((itemAtual) => itemAtual.chave !== rascunho.chave));
        mostrarAlerta('Exercício já adicionado', `${rascunho.exercicioNome} já está neste treino.`);
      } else if (atualizados) {
        mostrarAlerta('Erro', 'Falha de conexão ao adicionar o exercício. Tente novamente.');
      }

      return;
    }

    if (!item) {
      return;
    }

    setRascunhos((atual) => atual.filter((itemAtual) => itemAtual.chave !== rascunho.chave));
    await recarregar();
  }

  function confirmarExclusao(idItem: number, nome: string) {
    mostrarAlerta('Remover exercício', `Deseja remover ${nome} deste treino?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          const sucesso = await deletar(idItem);

          if (sucesso) {
            await recarregar();
          }
        },
      },
    ]);
  }

  const primeiraCarga = carregando && itens.length === 0;

  return (
    <Tela teclado aoAtualizar={aoAtualizar} atualizando={atualizando}>
      <CabecalhoDetalhe titulo={tituloTelaTreino(treino?.dia_semana)} />

      <Text style={estilos.titulo}>{tituloTreino.toUpperCase()}</Text>
      {ficha ? (
        <Text style={estilos.contexto} numberOfLines={2}>
          {subtituloTreino(ficha.aluno_nome, ficha.nome)}
        </Text>
      ) : null}
      <Text style={estilos.subtitulo}>
        {itens.length === 0
          ? 'Séries, repetições, carga e descanso'
          : `${itens.length} exercício${itens.length === 1 ? '' : 's'} · use as setas para reordenar`}
      </Text>

      <View style={estilos.lista}>
        {erro ? (
          <EstadoErro mensagem={erro} aoTentarNovamente={recarregar} />
        ) : primeiraCarga ? (
          <SkeletonLista linhas={3} />
        ) : (
          <>
            {itensOrdenados.map((item, indice) =>
              itemEmEdicao === item.id ? (
                <FormularioEdicaoItem
                  key={item.id}
                  item={item}
                  salvando={editando}
                  onSalvar={(dados) => salvarEdicao(item.id, dados)}
                  onCancelar={() => setItemEmEdicao(null)}
                />
              ) : (
                <CardItemTreino
                  key={item.id}
                  item={item}
                  onRemover={confirmarExclusao}
                  onEditar={() => setItemEmEdicao(item.id)}
                  onSubir={indice > 0 ? () => moverItem(indice, -1) : undefined}
                  onDescer={
                    indice < itensOrdenados.length - 1 ? () => moverItem(indice, 1) : undefined
                  }
                  desabilitado={salvando || editando}
                />
              )
            )}

            {rascunhos.map((rascunho) => (
              <FormularioRascunhoItem
                key={rascunho.chave}
                rascunho={rascunho}
                onAtualizar={(campo, valor) => atualizarRascunho(rascunho.chave, campo, valor)}
                onAbrirSeletor={() => abrirSeletor(rascunho.chave)}
                onSalvar={() => salvarRascunho(rascunho)}
                onCancelar={() =>
                  setRascunhos((atual) => atual.filter((item) => item.chave !== rascunho.chave))
                }
                salvando={salvando}
              />
            ))}

            {itens.length === 0 && rascunhos.length === 0 ? (
              <EstadoVazio
                icone="barbell-outline"
                titulo="Nenhum exercício neste treino"
                descricao="Adicione os exercícios com séries, repetições, carga e descanso."
              />
            ) : null}
          </>
        )}
      </View>

      {rascunhos.length === 0 ? (
        <Botao
          variante="secundario"
          onPress={() => setRascunhos((atual) => [...atual, criarRascunho()])}
        >
          + ADICIONAR EXERCÍCIO
        </Botao>
      ) : null}

      <ModalSeletorExercicio
        visivel={modalVisivel}
        onFechar={() => {
          setModalVisivel(false);
          setChaveSelecao(null);
        }}
        onSelecionar={escolherExercicio}
      />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  titulo: { color: cores.texto, fontFamily: fonteDisplay, fontSize: 24, lineHeight: 30 },
  contexto: { color: cores.primaria, fontSize: 14, fontWeight: '600', marginTop: 6 },
  subtitulo: { color: cores.textoSecundario, fontSize: 13, marginTop: 6 },
  lista: { marginTop: 20, marginBottom: 8 },
});
