import { StyleSheet, Text, View } from 'react-native';

import { cores } from '@/theme';
import { calcularPaginacao } from '@/utils/paginacao';

import { Botao } from './Botao';

export interface PaginacaoProps {
  /** Total de itens no servidor. */
  total: number;
  tamanhoPagina: number;
  /** Página atual (a partir de 1). */
  pagina: number;
  aoMudarPagina: (pagina: number) => void;
  /** Desabilita os botões enquanto carrega a página. */
  carregando?: boolean;
  testID?: string;
}

/** "21–40 de 135" + Anterior/Próxima. Não aparece quando não há itens. */
export function Paginacao({ total, tamanhoPagina, pagina, aoMudarPagina, carregando, testID }: PaginacaoProps) {
  const estado = calcularPaginacao(total, tamanhoPagina, pagina);

  if (total <= 0) {
    return null;
  }

  return (
    <View style={estilos.linha} testID={testID} accessibilityRole="toolbar" accessibilityLabel="Paginação">
      <View
        accessible
        accessibilityLabel={`Itens ${estado.inicio} a ${estado.fim} de ${total}. Página ${estado.pagina} de ${estado.totalPaginas}`}
      >
        <Text style={estilos.intervalo}>
          {estado.inicio}–{estado.fim} de {total}
        </Text>
        <Text style={estilos.pagina}>
          Página {estado.pagina} de {estado.totalPaginas}
        </Text>
      </View>

      <View style={estilos.botoes}>
        <Botao
          variante="secundario"
          tamanho="medio"
          larguraTotal={false}
          icone="chevron-back"
          disabled={!estado.temAnterior || carregando}
          onPress={() => aoMudarPagina(estado.pagina - 1)}
          accessibilityLabel="Página anterior"
          testID="paginacao-anterior"
        >
          Anterior
        </Botao>
        <Botao
          variante="secundario"
          tamanho="medio"
          larguraTotal={false}
          disabled={!estado.temProxima || carregando}
          onPress={() => aoMudarPagina(estado.pagina + 1)}
          accessibilityLabel="Próxima página"
          testID="paginacao-proxima"
        >
          Próxima
        </Botao>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 12,
  },
  intervalo: { color: cores.texto, fontSize: 14, fontWeight: '600' },
  pagina: { color: cores.textoSecundario, fontSize: 12, marginTop: 2 },
  botoes: { flexDirection: 'row', gap: 8 },
});
