import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { cores, raios } from '@/theme';

import { Cartao } from './Cartao';
import { EstadoErro } from './EstadoErro';
import { EstadoVazio } from './EstadoVazio';
import { Pressionavel } from './Pressionavel';
import { SkeletonLista } from './Skeleton';
import { useLarguraTela } from './useLarguraTela';

export interface ColunaTabela<T> {
  /** Identificador estável da coluna (usado na ordenação e nos testIDs). */
  chave: string;
  titulo: string;
  /** Conteúdo da célula; texto/número vira `Text` automaticamente. */
  render: (item: T) => ReactNode;
  /** Peso relativo da largura na tabela (padrão 1). */
  peso?: number;
  alinhamento?: 'esquerda' | 'centro' | 'direita';
  /** Habilita ordenar tocando no cabeçalho; exige `valorOrdenacao`. */
  ordenavel?: boolean;
  valorOrdenacao?: (item: T) => string | number;
  /** No cartão do celular, esta coluna vira o título (sem rótulo). */
  principal?: boolean;
  /** Não aparece no cartão do celular. */
  ocultarNoCartao?: boolean;
  /** Coluna de ações: no cartão do celular fica no rodapé, sem o rótulo da coluna. */
  acoes?: boolean;
}

export interface TabelaDadosProps<T> {
  colunas: ColunaTabela<T>[];
  dados: T[];
  chaveItem: (item: T) => string | number;
  /** Linha/cartão clicável. */
  aoPressionar?: (item: T) => void;
  carregando?: boolean;
  erro?: string | null;
  aoTentarNovamente?: () => void;
  vazio?: { titulo: string; descricao?: string; icone?: keyof typeof Ionicons.glyphMap };
  /** Ordenação inicial. */
  ordenacaoInicial?: { chave: string; direcao: 'asc' | 'desc' };
  /** Rótulo de acessibilidade da tabela (ex.: "Lista de alunos"). */
  rotulo?: string;
  testID?: string;
}

export type DirecaoOrdenacao = 'asc' | 'desc';

/** Ordena uma cópia estável; sem coluna ordenável devolve a lista como veio. */
export function ordenarDados<T>(
  dados: T[],
  coluna: ColunaTabela<T> | undefined,
  direcao: DirecaoOrdenacao,
): T[] {
  const valor = coluna?.valorOrdenacao;

  if (!valor) {
    return dados;
  }

  const fator = direcao === 'asc' ? 1 : -1;

  return dados
    .map((item, indice) => ({ item, indice }))
    .sort((a, b) => {
      const va = valor(a.item);
      const vb = valor(b.item);
      const comparacao =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), 'pt-BR', { sensitivity: 'base', numeric: true });

      return comparacao !== 0 ? comparacao * fator : a.indice - b.indice;
    })
    .map(({ item }) => item);
}

function Conteudo({ valor, estilo }: { valor: ReactNode; estilo: object }) {
  if (typeof valor === 'string' || typeof valor === 'number') {
    return <Text style={estilo}>{valor}</Text>;
  }

  return <>{valor}</>;
}

/**
 * Largura mínima da coluna para o título (caixa alta, 11 px, espaçamento 1,2) caber inteiro, com o ícone
 * de ordenação quando houver. Cabeçalho e células usam a mesma, então as colunas continuam alinhadas (QA-GA-04).
 */
export function larguraMinimaColuna(coluna: { titulo: string; ordenavel?: boolean }): number {
  return Math.ceil(coluna.titulo.length * 8.6) + (coluna.ordenavel ? 20 : 0) + 8;
}

const ALINHAMENTO = {
  esquerda: 'flex-start',
  centro: 'center',
  direita: 'flex-end',
} as const;

/**
 * Tabela de dados responsiva: no médio/largo (>= 768) é tabela com cabeçalho; no celular,
 * cartões empilhados com a coluna `principal` como título. Ordenação opcional por coluna,
 * linha clicável e estados de carregamento, erro e vazio.
 */
export function TabelaDados<T>({
  colunas,
  dados,
  chaveItem,
  aoPressionar,
  carregando = false,
  erro,
  aoTentarNovamente,
  vazio = { titulo: 'Nada por aqui ainda' },
  ordenacaoInicial,
  rotulo,
  testID,
}: TabelaDadosProps<T>) {
  const { ehMedio } = useLarguraTela();
  const [ordenacao, setOrdenacao] = useState(ordenacaoInicial ?? null);
  // Colunas de ações trazem botões dentro da linha/cartão clicável: o contêiner não pode ser um <button> (web).
  const contemControles = colunas.some((c) => c.acoes);

  const linhas = useMemo(() => {
    const coluna = ordenacao ? colunas.find((c) => c.chave === ordenacao.chave) : undefined;

    return ordenarDados(dados, coluna, ordenacao?.direcao ?? 'asc');
  }, [dados, colunas, ordenacao]);

  if (erro) {
    return <EstadoErro mensagem={erro} aoTentarNovamente={aoTentarNovamente} />;
  }

  if (carregando) {
    return <SkeletonLista linhas={5} />;
  }

  if (linhas.length === 0) {
    return <EstadoVazio icone={vazio.icone} titulo={vazio.titulo} descricao={vazio.descricao} />;
  }

  function alternarOrdem(chave: string) {
    setOrdenacao((atual) =>
      atual?.chave === chave && atual.direcao === 'asc' ? { chave, direcao: 'desc' } : { chave, direcao: 'asc' },
    );
  }

  if (!ehMedio) {
    const principal = colunas.find((c) => c.principal) ?? colunas[0];
    const visiveis = colunas.filter((c) => c !== principal && !c.ocultarNoCartao);
    const demais = visiveis.filter((c) => !c.acoes);
    const rodape = visiveis.filter((c) => c.acoes);

    return (
      <View style={estilos.cartoes} testID={testID} accessibilityLabel={rotulo}>
        {linhas.map((item) => {
          const chave = chaveItem(item);

          return (
            <Cartao
              key={chave}
              onPress={aoPressionar ? () => aoPressionar(item) : undefined}
              contemControles={contemControles}
              testID={`${testID ?? 'tabela'}-cartao-${chave}`}
            >
              <Conteudo valor={principal.render(item)} estilo={estilos.tituloCartao} />
              {demais.map((coluna) => (
                <View key={coluna.chave} style={estilos.campoCartao}>
                  <Text style={estilos.rotuloCartao}>{coluna.titulo}</Text>
                  <View style={estilos.valorCartao}>
                    <Conteudo valor={coluna.render(item)} estilo={estilos.textoCelula} />
                  </View>
                </View>
              ))}
              {rodape.map((coluna) => (
                <View key={coluna.chave} style={estilos.rodapeCartao} testID={`${testID ?? 'tabela'}-acoes-${chave}`}>
                  <Conteudo valor={coluna.render(item)} estilo={estilos.textoCelula} />
                </View>
              ))}
            </Cartao>
          );
        })}
      </View>
    );
  }

  return (
    <View style={estilos.tabela} testID={testID} accessibilityRole="list" accessibilityLabel={rotulo}>
      <View style={estilos.cabecalho}>
        {colunas.map((coluna) => {
          const ativa = ordenacao?.chave === coluna.chave;
          const podeOrdenar = coluna.ordenavel && !!coluna.valorOrdenacao;
          const alinhamento = ALINHAMENTO[coluna.alinhamento ?? 'esquerda'];
          const conteudo = (
            <View style={[estilos.celulaCabecalho, { justifyContent: alinhamento }]}>
              <Text style={[estilos.textoCabecalho, ativa && estilos.textoCabecalhoAtivo]}>
                {coluna.titulo}
              </Text>
              {podeOrdenar ? (
                <Ionicons
                  name={ativa ? (ordenacao?.direcao === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical'}
                  size={14}
                  color={ativa ? cores.primaria : cores.textoTerciario}
                />
              ) : null}
            </View>
          );

          return (
            <View key={coluna.chave} style={{ flex: coluna.peso ?? 1, minWidth: larguraMinimaColuna(coluna) }}>
              {podeOrdenar ? (
                <Pressionavel
                  onPress={() => alternarOrdem(coluna.chave)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ordenar por ${coluna.titulo}`}
                  accessibilityState={{ selected: ativa }}
                  testID={`tabela-ordenar-${coluna.chave}`}
                  style={estilos.alvoCabecalho}
                >
                  {conteudo}
                </Pressionavel>
              ) : (
                <View style={estilos.alvoCabecalho}>{conteudo}</View>
              )}
            </View>
          );
        })}
      </View>

      {linhas.map((item, indice) => {
        const chave = chaveItem(item);
        const celulas = colunas.map((coluna) => (
          <View
            key={coluna.chave}
            style={[
              estilos.celula,
              { flex: coluna.peso ?? 1, minWidth: larguraMinimaColuna(coluna), alignItems: ALINHAMENTO[coluna.alinhamento ?? 'esquerda'] },
            ]}
          >
            <Conteudo valor={coluna.render(item)} estilo={estilos.textoCelula} />
          </View>
        ));
        const estiloLinha = [estilos.linha, indice === linhas.length - 1 && estilos.ultimaLinha];

        return aoPressionar ? (
          <Pressionavel
            key={chave}
            onPress={() => aoPressionar(item)}
            escala={0.995}
            style={estiloLinha}
            accessibilityRole="button"
            contemControles={contemControles}
            testID={`${testID ?? 'tabela'}-linha-${chave}`}
          >
            {celulas}
          </Pressionavel>
        ) : (
          <View key={chave} style={estiloLinha} testID={`${testID ?? 'tabela'}-linha-${chave}`}>
            {celulas}
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  cartoes: { gap: 12 },
  tituloCartao: { color: cores.texto, fontSize: 17, fontWeight: '700', marginBottom: 8 },
  campoCartao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 4 },
  rotuloCartao: { color: cores.textoSecundario, fontSize: 13 },
  rodapeCartao: { marginTop: 8 },
  valorCartao: { flexShrink: 1, alignItems: 'flex-end' },
  tabela: {
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.cartao,
    overflow: 'hidden',
  },
  cabecalho: {
    flexDirection: 'row',
    backgroundColor: cores.superficieElevada,
    borderBottomWidth: 1,
    borderBottomColor: cores.borda,
    paddingHorizontal: 16,
  },
  alvoCabecalho: { minHeight: 44, justifyContent: 'center' },
  celulaCabecalho: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 8 },
  textoCabecalho: { color: cores.textoSecundario, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  textoCabecalhoAtivo: { color: cores.primaria },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cores.borda,
  },
  ultimaLinha: { borderBottomWidth: 0 },
  celula: { paddingRight: 8, paddingVertical: 8 },
  textoCelula: { color: cores.texto, fontSize: 14 },
});
