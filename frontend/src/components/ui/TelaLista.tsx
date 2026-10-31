import { ReactElement, ReactNode } from 'react';
import {
  FlatList,
  ListRenderItem,
  RefreshControl,
  SectionList,
  SectionListData,
  SectionListRenderItem,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cores, margemTela } from '@/theme';

import { VeuStatusBar } from './VeuStatusBar';

interface BaseTelaListaProps {
  /** Conteúdo acima dos itens (cabeçalho grande, busca, filtros). Rola junto. */
  cabecalho?: ReactNode;
  /** Mostrado no lugar dos itens quando a lista está vazia (vazio, erro ou esqueleto). */
  vazio?: ReactNode;
  /** Rodapé da lista (ex.: "carregando mais"). */
  rodape?: ReactNode;
  aoAtualizar?: () => void;
  atualizando?: boolean;
  /** Chamado perto do fim da lista (rolagem infinita). */
  aoChegarAoFim?: () => void;
  /** A tela fica dentro das abas (a barra já cobre a safe area de baixo). */
  abas?: boolean;
  /** Espaço extra no fim da lista (ex.: `ESPACO_BOTAO_FLUTUANTE`, para o botão flutuante não cobrir o último item). */
  espacoInferior?: number;
  testID?: string;
}

export interface TelaListaProps<T> extends BaseTelaListaProps {
  dados: T[];
  renderItem: ListRenderItem<T>;
  chave: (item: T, indice: number) => string;
}

export interface TelaSecoesProps<T, S> extends BaseTelaListaProps {
  secoes: SectionListData<T, S>[];
  renderItem: SectionListRenderItem<T, S>;
  renderSecao?: (info: { section: SectionListData<T, S> }) => ReactElement | null;
  chave: (item: T, indice: number) => string;
}

function useEstiloLista(abas: boolean, espacoInferior: number) {
  const insets = useSafeAreaInsets();

  return {
    paddingTop: insets.top + 8,
    paddingBottom: (abas ? 0 : insets.bottom) + 32 + espacoInferior,
    paddingHorizontal: margemTela,
  };
}

function controleAtualizar(aoAtualizar?: () => void, atualizando = false) {
  return aoAtualizar ? (
    <RefreshControl
      refreshing={atualizando}
      onRefresh={aoAtualizar}
      tintColor={cores.primaria}
      colors={[cores.primaria]}
      progressBackgroundColor={cores.superficieElevada}
    />
  ) : undefined;
}

/**
 * Tela com lista virtualizada (FlatList): mesma casca de `Tela` (safe area, fundo, margem 20,
 * véu na status bar e puxar-para-atualizar). Use para listas que crescem sem limite.
 */
export function TelaLista<T>({
  dados,
  renderItem,
  chave,
  cabecalho,
  vazio,
  rodape,
  aoAtualizar,
  atualizando,
  aoChegarAoFim,
  abas = false,
  espacoInferior = 0,
  testID,
}: TelaListaProps<T>) {
  const estiloConteudo = useEstiloLista(abas, espacoInferior);

  return (
    <View style={estilos.raiz} testID={testID}>
      <FlatList
        data={dados}
        renderItem={renderItem}
        keyExtractor={chave}
        contentContainerStyle={estiloConteudo}
        ListHeaderComponent={<>{cabecalho}</>}
        ListEmptyComponent={<>{vazio}</>}
        ListFooterComponent={<>{rodape}</>}
        refreshControl={controleAtualizar(aoAtualizar, atualizando)}
        onEndReached={aoChegarAoFim}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={10}
        windowSize={7}
      />
      <VeuStatusBar />
    </View>
  );
}

/** Como `TelaLista`, mas com seções (SectionList): ex.: histórico agrupado por mês. */
export function TelaSecoes<T, S = unknown>({
  secoes,
  renderItem,
  renderSecao,
  chave,
  cabecalho,
  vazio,
  rodape,
  aoAtualizar,
  atualizando,
  aoChegarAoFim,
  abas = false,
  espacoInferior = 0,
  testID,
}: TelaSecoesProps<T, S>) {
  const estiloConteudo = useEstiloLista(abas, espacoInferior);

  return (
    <View style={estilos.raiz} testID={testID}>
      <SectionList
        sections={secoes}
        renderItem={renderItem}
        renderSectionHeader={renderSecao}
        keyExtractor={chave}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={estiloConteudo}
        ListHeaderComponent={<>{cabecalho}</>}
        ListEmptyComponent={<>{vazio}</>}
        ListFooterComponent={<>{rodape}</>}
        refreshControl={controleAtualizar(aoAtualizar, atualizando)}
        onEndReached={aoChegarAoFim}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={10}
        windowSize={7}
      />
      <VeuStatusBar />
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.fundo },
});
