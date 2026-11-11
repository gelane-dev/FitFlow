import { StyleSheet, Text, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { VisualizacaoVersao } from '@/components/professor/VisualizacaoVersao';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { ConteudoLargo } from '@/components/ui/ConteudoLargo';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoErroSecao } from '@/components/ui/EstadoErroSecao';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { LinhaLista } from '@/components/ui/LinhaLista';
import { SkeletonLista } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useProfessorVersoes } from '@/hooks/useProfessorVersoes';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { cores } from '@/theme';
import { paramTexto } from '@/utils/params';
import { formatarDataHora } from '@/utils/professorWeb';

/** Versões da ficha (/fichas/[id]/versoes): lista das publicações e visualização somente leitura. */
export default function VersoesFicha() {
  const { id } = useLocalSearchParams();
  const fichaId = Number(paramTexto(id));
  const v = useProfessorVersoes(fichaId);

  useRecarregarNoFoco(v.recarregar);

  if (v.numeroAberto !== null) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo={`Versão ${v.numeroAberto}`} aoVoltar={v.fechar} />
        <ConteudoLargo larguraMaxima={900}>
          {v.carregandoVersao ? (
            <SkeletonLista linhas={4} />
          ) : v.erroVersao ? (
            <EstadoErroSecao
              mensagem={v.erroVersao}
              aoTentarNovamente={() => v.abrir(v.numeroAberto as number)}
            />
          ) : v.versao ? (
            <>
              <Text style={estilos.leitura} testID="versao-somente-leitura">
                Somente leitura · publicada em {formatarDataHora(v.versao.publicada_em)}
                {v.versao.publicada_por?.nome ? ` por ${v.versao.publicada_por.nome}` : ''}
              </Text>
              <VisualizacaoVersao ficha={v.versao.conteudo} />
            </>
          ) : null}
          <View style={estilos.espaco} />
          <Botao variante="secundario" tamanho="medio" onPress={v.fechar} testID="versao-voltar-lista">
            Voltar às versões
          </Botao>
        </ConteudoLargo>
      </Tela>
    );
  }

  return (
    <Tela>
      <CabecalhoDetalhe titulo="Versões da ficha" />
      <ConteudoLargo larguraMaxima={900}>
        <TituloSecao titulo="Publicações" />

        {v.carregando ? (
          <SkeletonLista linhas={3} />
        ) : v.erro ? (
          <EstadoErro mensagem={v.erro} aoTentarNovamente={v.recarregar} />
        ) : v.versoes.length === 0 ? (
          <EstadoVazio
            icone="time-outline"
            titulo="Nenhuma versão publicada"
            descricao="A ficha ainda está em rascunho. Cada publicação cria uma versão aqui."
            acaoRotulo="Abrir no montador"
            aoAcionar={() =>
              router.push({ pathname: '/fichas/[id]/montar' as any, params: { id: String(fichaId) } })
            }
          />
        ) : (
          v.versoes.map((versao, indice) => (
            <LinhaLista
              key={versao.numero}
              titulo={`Versão ${versao.numero}${indice === 0 ? ' · atual' : ''}`}
              subtitulo={`${formatarDataHora(versao.publicada_em)}${
                versao.publicada_por?.nome ? ` · ${versao.publicada_por.nome}` : ''
              }`}
              icone="document-text-outline"
              onPress={() => v.abrir(versao.numero)}
              testID={`versao-${versao.numero}`}
            />
          ))
        )}
      </ConteudoLargo>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  leitura: { color: cores.textoSecundario, fontSize: 13, marginBottom: 12 },
  espaco: { height: 20 },
});
