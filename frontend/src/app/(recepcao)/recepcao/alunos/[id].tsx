import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AcoesAlunoGestao } from '@/components/gestao/AcoesAlunoGestao';
import { CabecalhoAluno } from '@/components/gestao/CabecalhoAluno';
import { CartaoMatricula } from '@/components/gestao/CartaoMatricula';
import { ModoDialogoMatricula } from '@/components/gestao/DialogoMatricula';
import { DialogosAlunoGestao, EstadoDialogoPagamento } from '@/components/gestao/DialogosAlunoGestao';
import { HistoricoEntradas } from '@/components/gestao/HistoricoEntradas';
import { ListaMatriculas } from '@/components/gestao/ListaMatriculas';
import { ListaPagamentos } from '@/components/gestao/ListaPagamentos';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { Cartao } from '@/components/ui/Cartao';
import { ConteudoLargo } from '@/components/ui/ConteudoLargo';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoErroSecao } from '@/components/ui/EstadoErroSecao';
import { GraficoBarras } from '@/components/ui/GraficoBarras';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useGestaoAcoesFinanceiras } from '@/hooks/useGestaoAcoesFinanceiras';
import { useGestaoAprovacao } from '@/hooks/useGestaoAprovacao';
import { useGestaoPlanos } from '@/hooks/useGestaoPlanos';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { useRecepcaoAlunoDetalhe } from '@/hooks/useRecepcaoAlunoDetalhe';
import { useRecepcaoPermissoes } from '@/hooks/useRecepcaoPermissoes';
import { cores } from '@/theme';
import { formatarData } from '@/utils/datas';
import { horaDaApi } from '@/utils/gestaoRecepcao';
import { paramTexto } from '@/utils/params';
import { rotuloSemana } from '@/utils/professorWeb';

function Dado({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return (
    <View style={estilos.dado}>
      <Text style={estilos.dadoRotulo}>{rotulo}</Text>
      <Text style={estilos.dadoValor}>{valor || '—'}</Text>
    </View>
  );
}

export default function DetalheAlunoRecepcao() {
  const { id: idParam } = useLocalSearchParams();
  const id = Number(paramTexto(idParam));
  const { permissoes, pode } = useRecepcaoPermissoes();
  const detalhe = useRecepcaoAlunoDetalhe(id);
  const { aluno, matriculas, pagamentos, acessos, frequencia } = detalhe;
  const planos = useGestaoPlanos(pode('matricular') || pode('renovar_matricula') || pode('alterar_plano'));
  const acoes = useGestaoAcoesFinanceiras(detalhe.recarregarTudo);
  const aprovacao = useGestaoAprovacao(detalhe.recarregarTudo);

  const [modoMatricula, setModoMatricula] = useState<ModoDialogoMatricula | null>(null);
  const [dialogoPagamento, setDialogoPagamento] = useState<EstadoDialogoPagamento | null>(null);
  const [editando, setEditando] = useState(false);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);

  useRecarregarNoFoco(detalhe.recarregarTudo);

  const dados = aluno.dados;
  const matriculaAtual = dados?.matricula_atual ?? null;
  const aprovado = dados?.status_cadastro === 'aprovado' && dados?.ativo;

  async function salvarEdicao(valores: Parameters<typeof detalhe.salvarDados>[0]) {
    setErroEdicao(null);

    const falha = await detalhe.salvarDados(valores);

    if (falha) {
      setErroEdicao(falha);

      return;
    }

    setEditando(false);
  }

  const semanas = frequencia.dados?.entradas_por_semana ?? [];

  return (
    <Tela aoAtualizar={detalhe.recarregarTudo} testID="tela-aluno-detalhe">
      <CabecalhoDetalhe titulo="Aluno" />

      <ConteudoLargo larguraMaxima={960}>
        {aluno.carregando && !dados ? (
          <Skeleton altura={110} raio={18} />
        ) : aluno.erro && !dados ? (
          <EstadoErro mensagem={aluno.erro} aoTentarNovamente={aluno.recarregar} />
        ) : dados ? (
          <>
            <CabecalhoAluno
              aluno={dados}
              acoes={
                <AcoesAlunoGestao
                  aluno={dados}
                  podeEditar={pode('editar_aluno')}
                  podeAprovar={pode('aprovar_aluno')}
                  aoEditar={() => {
                    setErroEdicao(null);
                    setEditando(true);
                  }}
                  processando={aprovacao.processando}
                  aoAprovar={() => aprovacao.aprovar(dados)}
                  aoRecusar={() => aprovacao.recusar(dados)}
                />
              }
            />

            <TituloSecao titulo="Dados" />
            <Cartao testID="aluno-dados">
              <Dado rotulo="Nascimento" valor={formatarData(dados.data_nascimento)} />
              <Dado rotulo="CPF" valor={dados.cpf} />
              <Dado rotulo="Endereço" valor={dados.endereco} />
              <Dado rotulo="Observações" valor={dados.observacoes} />
              <Dado rotulo="Código de acesso" valor={dados.codigo_acesso} />
              {dados.restricao_acesso ? <Dado rotulo="Restrição de acesso" valor={dados.restricao_acesso} /> : null}
            </Cartao>

            <TituloSecao titulo="Matrícula atual" />
            <CartaoMatricula
              matricula={matriculaAtual}
              permissoes={permissoes}
              podeMatricular={!!aprovado}
              aoMatricular={() => setModoMatricula('nova')}
              aoRenovar={() => setModoMatricula('renovar')}
              aoAlterarPlano={() => setModoMatricula('alterar')}
              aoCancelar={() => setModoMatricula('cancelar')}
            />
          </>
        ) : null}

        <TituloSecao
          titulo="Pagamentos"
          acao={
            pode('registrar_pagamento') && dados
              ? { rotulo: 'Pagamento avulso', onPress: () => setDialogoPagamento({ modo: 'avulso', pagamento: null }) }
              : undefined
          }
        />
        <ListaPagamentos
          pagamentos={pagamentos.dados ?? []}
          permissoes={permissoes}
          carregando={pagamentos.carregando}
          erro={pagamentos.erro}
          aoTentarNovamente={pagamentos.recarregar}
          aoRegistrar={(p) => setDialogoPagamento({ modo: 'registrar', pagamento: p })}
          aoEstornar={(p) => setDialogoPagamento({ modo: 'estornar', pagamento: p })}
          aoVerComprovante={(p) => router.push(`/recepcao/pagamentos/${p.id}/comprovante` as never)}
        />

        <TituloSecao titulo="Histórico de matrículas" />
        <ListaMatriculas
          matriculas={matriculas.dados ?? []}
          carregando={matriculas.carregando}
          erro={matriculas.erro}
          aoTentarNovamente={matriculas.recarregar}
        />

        <TituloSecao titulo="Frequência (últimos 6 meses)" />
        {frequencia.erro ? (
          <EstadoErroSecao mensagem={frequencia.erro} aoTentarNovamente={frequencia.recarregar} testID="erro-frequencia" />
        ) : frequencia.carregando && !frequencia.dados ? (
          <Skeleton altura={160} raio={18} />
        ) : frequencia.dados ? (
          <Cartao testID="aluno-frequencia">
            <Text style={estilos.resumo}>
              {frequencia.dados.total_periodo} entrada(s) no período
              {frequencia.dados.ultima_entrada
                ? ` · última em ${formatarData(frequencia.dados.ultima_entrada)} ${horaDaApi(frequencia.dados.ultima_entrada)}`
                : ''}
              {' · '}
              {frequencia.dados.sessoes_treino_periodo} treino(s) finalizado(s)
            </Text>
            <GraficoBarras
              rotulo="Entradas por semana"
              dados={semanas.slice(-12).map((s) => ({ rotulo: rotuloSemana(s.semana_inicio), valor: s.total }))}
              mensagemVazio="Sem entradas no período"
              testID="grafico-frequencia"
            />
          </Cartao>
        ) : null}

        <TituloSecao titulo="Últimas entradas" />
        <HistoricoEntradas
          acessos={acessos.dados?.itens ?? []}
          carregando={acessos.carregando}
          erro={acessos.erro}
          aoTentarNovamente={acessos.recarregar}
          mostrarData
          testID="aluno-entradas"
        />
      </ConteudoLargo>

      {dados ? (
        <DialogosAlunoGestao
          aluno={dados}
          matriculaAtual={matriculaAtual}
          planos={planos}
          modoMatricula={modoMatricula}
          aoFecharMatricula={() => setModoMatricula(null)}
          aoConfirmarMatricula={(resultado) => acoes.executarMatricula(resultado, matriculaAtual?.id)}
          dialogoPagamento={dialogoPagamento}
          aoFecharPagamento={() => setDialogoPagamento(null)}
          aoConfirmarPagamento={(resultado) => acoes.executarPagamento(resultado, dialogoPagamento?.pagamento?.id)}
          editando={editando}
          aoFecharEdicao={() => setEditando(false)}
          formulario={{ aoAtualizar: salvarEdicao, enviando: detalhe.salvando, erroGeral: erroEdicao }}
        />
      ) : null}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  dado: { flexDirection: 'row', gap: 12, paddingVertical: 6 },
  dadoRotulo: { color: cores.textoSecundario, fontSize: 13, width: 130 },
  dadoValor: { color: cores.texto, fontSize: 14, flex: 1 },
  resumo: { color: cores.textoSecundario, fontSize: 13, marginBottom: 12 },
});
