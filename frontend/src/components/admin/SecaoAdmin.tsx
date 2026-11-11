import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/ui/Botao';
import { Cartao } from '@/components/ui/Cartao';
import { EstadoErroSecao } from '@/components/ui/EstadoErroSecao';
import { Skeleton } from '@/components/ui/Skeleton';
import { cores, espacamento, tipografia } from '@/theme';

export interface SecaoAdminProps {
  titulo: string;
  /** Texto de apoio abaixo do título (ex.: o que a unidade do eixo representa). */
  subtitulo?: string;
  carregando?: boolean;
  erro?: string | null;
  aoTentarNovamente?: () => void;
  /** Mensagem quando a seção não tem conteúdo; quando informada, substitui `children`. */
  vazio?: string | null;
  acao?: { rotulo: string; onPress: () => void; icone?: string };
  children?: ReactNode;
  testID?: string;
}

/**
 * Cartão de uma seção das telas do admin, com carregamento, erro e vazio próprios
 * (uma seção falha sem derrubar a tela).
 */
export function SecaoAdmin({
  titulo,
  subtitulo,
  carregando = false,
  erro,
  aoTentarNovamente,
  vazio,
  acao,
  children,
  testID,
}: SecaoAdminProps) {
  let corpo: ReactNode = children;

  if (erro) {
    corpo = <EstadoErroSecao mensagem={erro} aoTentarNovamente={aoTentarNovamente} />;
  } else if (carregando) {
    corpo = (
      <View style={estilos.esqueleto} accessibilityLabel={`Carregando ${titulo}`}>
        <Skeleton altura={20} largura="60%" />
        <Skeleton altura={96} raio={12} />
      </View>
    );
  } else if (vazio) {
    corpo = <Text style={estilos.vazio}>{vazio}</Text>;
  }

  return (
    <Cartao style={estilos.cartao} testID={testID}>
      <View style={estilos.cabecalho}>
        <View style={estilos.textos}>
          <Text style={estilos.titulo} accessibilityRole="header">
            {titulo}
          </Text>
          {subtitulo ? <Text style={estilos.subtitulo}>{subtitulo}</Text> : null}
        </View>
        {acao ? (
          <Botao variante="fantasma" tamanho="medio" larguraTotal={false} onPress={acao.onPress}>
            {acao.rotulo}
          </Botao>
        ) : null}
      </View>
      {corpo}
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  cartao: { gap: espacamento.md, height: '100%' },
  cabecalho: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: espacamento.sm },
  textos: { flex: 1, gap: 2 },
  titulo: { ...tipografia.corpoForte, color: cores.texto },
  subtitulo: { ...tipografia.legenda, color: cores.textoTerciario },
  esqueleto: { gap: espacamento.sm },
  vazio: { ...tipografia.corpo, color: cores.textoSecundario },
});
