import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HistoricoEntradas } from '@/components/gestao/HistoricoEntradas';
import { PainelEntrada } from '@/components/gestao/PainelEntrada';
import { SeloSituacao } from '@/components/ui/SeloSituacao';
import { BarraFiltros } from '@/components/ui/BarraFiltros';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { ConteudoLargo } from '@/components/ui/ConteudoLargo';
import { EstadoErroSecao } from '@/components/ui/EstadoErroSecao';
import { LinhaLista } from '@/components/ui/LinhaLista';
import { SkeletonLista } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { useRecepcaoEntrada } from '@/hooks/useRecepcaoEntrada';
import { useRecepcaoPermissoes } from '@/hooks/useRecepcaoPermissoes';
import { cores } from '@/theme';
import { situacaoPrincipalAluno } from '@/utils/gestaoRecepcao';
import { situacaoAluno, statusCadastro } from '@/utils/situacao';

export default function EntradaRecepcao() {
  const entrada = useRecepcaoEntrada();
  const { permissoes } = useRecepcaoPermissoes();
  const { resultados, verificacao, entradasHoje } = entrada;

  useRecarregarNoFoco(entradasHoje.recarregar);

  const buscando = entrada.termo.trim().length >= 2;
  const lista = resultados.dados?.itens ?? [];
  const mostrarResultados = buscando && !entrada.alvo;

  return (
    <Tela abas aoAtualizar={entradasHoje.recarregar} testID="tela-entrada">
      <CabecalhoGrande rotulo="Atendimento" titulo="Entrada" />

      <ConteudoLargo larguraMaxima={760}>
        <Fragment key={entrada.chaveBusca}>
          <BarraFiltros
            aoBuscar={entrada.buscar}
            placeholder="Nome, CPF, telefone ou código do aluno"
            testID="entrada-busca"
          />
        </Fragment>

        {mostrarResultados ? (
          <View style={estilos.resultados} testID="entrada-resultados">
            {resultados.carregando && lista.length === 0 ? <SkeletonLista linhas={3} /> : null}
            {resultados.erro ? (
              <EstadoErroSecao mensagem={resultados.erro} aoTentarNovamente={resultados.recarregar} />
            ) : null}
            {!resultados.carregando && !resultados.erro && lista.length === 0 ? (
              <Text style={estilos.vazio} testID="entrada-sem-resultado">
                Nenhum aluno encontrado para &quot;{entrada.termo.trim()}&quot;.
              </Text>
            ) : null}
            {lista.map((a, i) => {
              const codigo = situacaoPrincipalAluno(a);

              return (
                <LinhaLista
                  key={a.id}
                  titulo={a.nome}
                  subtitulo={a.telefone}
                  thumbUri={a.foto}
                  icone="person"
                  direita={
                    <SeloSituacao info={codigo === 'recusado' ? statusCadastro('recusado') : situacaoAluno(codigo)} />
                  }
                  separador={i < lista.length - 1}
                  onPress={() => entrada.selecionarAluno(a.id)}
                  testID={`entrada-aluno-${a.id}`}
                />
              );
            })}
          </View>
        ) : null}

        {entrada.alvo ? (
          <View style={estilos.painel}>
            <PainelEntrada
              verificacao={verificacao.dados}
              carregando={verificacao.carregando}
              erro={verificacao.erro}
              aoTentarNovamente={verificacao.recarregar}
              permissoes={permissoes}
              registro={entrada.registro}
              registrando={entrada.registrando}
              erroRegistro={entrada.erroRegistro}
              aoRegistrar={(forcar) => entrada.registrar(forcar)}
              aoProximo={entrada.proximo}
            />
          </View>
        ) : null}

        <TituloSecao titulo="Entradas de hoje" />
        <HistoricoEntradas
          acessos={entradasHoje.dados?.itens ?? []}
          carregando={entradasHoje.carregando}
          erro={entradasHoje.erro}
          aoTentarNovamente={entradasHoje.recarregar}
          mostrarAluno
          textoVazio="Nenhuma entrada hoje ainda"
          testID="entradas-hoje"
        />
      </ConteudoLargo>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  resultados: { marginTop: 4 },
  vazio: { color: cores.textoSecundario, fontSize: 14, paddingVertical: 16, textAlign: 'center' },
  painel: { marginTop: 16 },
});
