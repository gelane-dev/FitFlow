import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/ui/Botao';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { Cartao } from '@/components/ui/Cartao';
import { ConteudoLargo, Grade } from '@/components/ui/ConteudoLargo';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { Indicador } from '@/components/ui/Indicador';
import { LinhaLista } from '@/components/ui/LinhaLista';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { useRecepcaoPainel } from '@/hooks/useRecepcaoPainel';
import { useRecepcaoPermissoes } from '@/hooks/useRecepcaoPermissoes';
import { cores } from '@/theme';
import { formatarData } from '@/utils/datas';
import { horaDaApi } from '@/utils/gestaoRecepcao';
import { rotuloData } from '@/utils/saudacao';
import { situacaoAluno } from '@/utils/situacao';

export default function PainelRecepcao() {
  const { dados, carregando, erro, recarregar } = useRecepcaoPainel();
  const { pode } = useRecepcaoPermissoes();

  useRecarregarNoFoco(recarregar);

  const carregandoInicial = carregando && !dados;

  const abrirAluno = (id: number) => router.push(`/recepcao/alunos/${id}` as never);

  return (
    <Tela abas aoAtualizar={recarregar} atualizando={carregando && !!dados} testID="painel-recepcao">
      <CabecalhoGrande rotulo={rotuloData()} titulo="Recepção" />

      <ConteudoLargo>
        <View style={estilos.atalhos}>
          <Botao
            icone="enter"
            larguraTotal={false}
            onPress={() => router.navigate('/recepcao/entrada' as never)}
            testID="atalho-entrada"
          >
            Registrar entrada
          </Botao>
          {pode('cadastrar_aluno') ? (
            <Botao
              icone="person-add"
              variante="secundario"
              larguraTotal={false}
              onPress={() => router.push('/recepcao/alunos/novo' as never)}
              testID="atalho-novo-aluno"
            >
              Novo aluno
            </Botao>
          ) : null}
        </View>

        {erro && !dados ? (
          <EstadoErro mensagem={erro} aoTentarNovamente={recarregar} />
        ) : (
          <>
            <Grade espaco={12}>
              <Indicador rotulo="Alunos ativos" valor={String(dados?.ativos ?? 0)} icone="people" carregando={carregandoInicial} testID="ind-ativos" />
              <Indicador rotulo="Entradas hoje" valor={String(dados?.entradas_hoje ?? 0)} icone="enter" carregando={carregandoInicial} testID="ind-entradas" />
              <Indicador rotulo="Matrículas hoje" valor={String(dados?.matriculas_hoje ?? 0)} icone="document-text" carregando={carregandoInicial} testID="ind-matriculas" />
              <Indicador rotulo="Vencendo" valor={String(dados?.vencendo ?? 0)} icone="time" carregando={carregandoInicial} testID="ind-vencendo" />
              <Indicador rotulo="Vencidos" valor={String(dados?.vencidos ?? 0)} icone="close-circle" carregando={carregandoInicial} testID="ind-vencidos" />
              <Indicador rotulo="Com pendência" valor={String(dados?.com_pendencia ?? 0)} icone="cash" carregando={carregandoInicial} testID="ind-pendencia" />
              <Indicador
                rotulo="Cadastros pendentes"
                valor={String(dados?.cadastros_pendentes ?? 0)}
                icone="hourglass"
                carregando={carregandoInicial}
                aoPressionar={() => router.navigate('/recepcao/alunos' as never)}
                testID="ind-pendentes"
              />
            </Grade>

            <TituloSecao titulo="Últimos cadastros" />
            <Cartao semPadding style={estilos.lista}>
              {dados && dados.ultimos_cadastros.length === 0 ? (
                <EstadoVazio icone="people-outline" titulo="Nenhum cadastro ainda" />
              ) : (
                (dados?.ultimos_cadastros ?? []).map((a, i, todos) => (
                  <LinhaLista
                    key={a.id}
                    titulo={a.nome}
                    subtitulo={`${situacaoAluno(a.status_cadastro === 'pendente' ? 'pendente' : a.situacao).rotulo}${a.criado_em ? ` · ${formatarData(a.criado_em)}` : ''}`}
                    thumbUri={a.foto}
                    icone="person"
                    separador={i < todos.length - 1}
                    onPress={() => abrirAluno(a.id)}
                    testID={`ultimo-cadastro-${a.id}`}
                  />
                ))
              )}
            </Cartao>

            <TituloSecao titulo="Atendimentos recentes" />
            <Cartao semPadding style={estilos.lista}>
              {dados && dados.atendimentos_recentes.length === 0 ? (
                <EstadoVazio icone="time-outline" titulo="Nenhum atendimento recente" />
              ) : (
                (dados?.atendimentos_recentes ?? []).map((a, i, todos) => (
                  <LinhaLista
                    key={a.id}
                    titulo={a.descricao}
                    subtitulo={`${formatarData(a.data_hora)} ${horaDaApi(a.data_hora)}`}
                    icone="pulse"
                    semChevron
                    separador={i < todos.length - 1}
                    testID={`atendimento-${a.id}`}
                  />
                ))
              )}
            </Cartao>
            {erro && dados ? <Text style={estilos.erro}>{erro}</Text> : null}
          </>
        )}
      </ConteudoLargo>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  atalhos: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  lista: { paddingHorizontal: 16 },
  erro: { color: cores.perigo, fontSize: 13, marginTop: 12 },
});
