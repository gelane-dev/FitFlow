import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ItemAuditoria } from '@/components/admin/ItemAuditoria';
import { CampoDataFiltro } from '@/components/admin/CampoDataFiltro';
import { SecaoAdmin } from '@/components/admin/SecaoAdmin';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { CampoSelecao } from '@/components/ui/CampoSelecao';
import { ConteudoLargo, Grade } from '@/components/ui/ConteudoLargo';
import { Paginacao } from '@/components/ui/Paginacao';
import { Tela } from '@/components/ui/Tela';
import { useLarguraTela } from '@/components/ui/useLarguraTela';
import { POR_PAGINA_AUDITORIA, useAdminAuditoria } from '@/hooks/useAdminAuditoria';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { espacamento } from '@/theme';
import { ACOES_AUDITORIA, ENTIDADES_AUDITORIA, rotuloAcao, rotuloTipoUsuario } from '@/utils/auditoria';
import { paramTexto } from '@/utils/params';

/** Auditoria: lista paginada com filtros (usuário, ação, entidade, período) e detalhes expansíveis. */
export default function AuditoriaAdmin() {
  const params = useLocalSearchParams();
  const userInicial = Number(paramTexto(params.user_id));
  const { ehMedio } = useLarguraTela();
  const aud = useAdminAuditoria(Number.isInteger(userInicial) && userInicial > 0 ? { userId: userInicial } : {});

  useRecarregarNoFoco(aud.recarregar);
  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(aud.recarregar);

  const usuarios = aud.usuarios.map((u) => ({ valor: u.id, rotulo: u.nome, descricao: rotuloTipoUsuario(u.tipo) }));
  const acoes = ACOES_AUDITORIA.map((a) => ({ valor: a, rotulo: rotuloAcao(a), descricao: a }));
  const entidades = ENTIDADES_AUDITORIA;

  return (
    <Tela aoAtualizar={aoAtualizar} atualizando={atualizando} testID="auditoria-admin">
      <ConteudoLargo>
        <CabecalhoDetalhe titulo="Auditoria" />

        <SecaoAdmin titulo="Filtros" subtitulo="O filtro de usuário lista quem já apareceu nos resultados.">
          <Grade colunas={ehMedio ? 3 : 1} espaco={12}>
            <CampoSelecao
              rotulo="Usuário"
              opcoes={usuarios}
              valor={aud.filtros.userId}
              aoMudar={(userId) => aud.definirFiltros({ userId })}
              placeholder="Todos"
              limpavel
              testID="filtro-usuario"
            />
            <CampoSelecao
              rotulo="Ação"
              opcoes={acoes}
              valor={aud.filtros.acao}
              aoMudar={(acao) => aud.definirFiltros({ acao })}
              placeholder="Todas"
              buscavel
              limpavel
              testID="filtro-acao"
            />
            <CampoSelecao
              rotulo="Entidade"
              opcoes={entidades}
              valor={aud.filtros.entidade}
              aoMudar={(entidade) => aud.definirFiltros({ entidade })}
              placeholder="Todas"
              limpavel
              testID="filtro-entidade"
            />
            <CampoDataFiltro rotulo="De" valor={aud.filtros.inicio} aoMudar={(inicio) => aud.definirFiltros({ inicio })} testID="filtro-inicio" />
            <CampoDataFiltro rotulo="Até" valor={aud.filtros.fim} aoMudar={(fim) => aud.definirFiltros({ fim })} testID="filtro-fim" />
          </Grade>
          {aud.filtrosAtivos ? (
            <View style={estilos.limpar}>
              <Botao variante="secundario" icone="close" tamanho="medio" larguraTotal={false} onPress={aud.limparFiltros} testID="filtro-limpar-tudo">
                Limpar filtros
              </Botao>
            </View>
          ) : null}
        </SecaoAdmin>

        <View style={estilos.lista}>
          <SecaoAdmin
            titulo="Registros"
            subtitulo={`${aud.total} registro(s)`}
            carregando={aud.carregando && aud.itens.length === 0 && !aud.erro}
            erro={aud.erro}
            aoTentarNovamente={aud.recarregar}
            vazio={!aud.carregando && aud.itens.length === 0 ? (aud.filtrosAtivos ? 'Nenhum registro com esses filtros.' : 'Nenhuma ação registrada ainda.') : null}
            testID="auditoria-lista"
          >
            {aud.itens.map((item) => (
              <ItemAuditoria key={item.id} item={item} testID={`auditoria-${item.id}`} />
            ))}
          </SecaoAdmin>
        </View>

        <Paginacao total={aud.total} tamanhoPagina={POR_PAGINA_AUDITORIA} pagina={aud.filtros.pagina} aoMudarPagina={aud.mudarPagina} carregando={aud.carregando} />
      </ConteudoLargo>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  limpar: { alignItems: 'flex-start' },
  lista: { marginTop: espacamento.lg },
});
