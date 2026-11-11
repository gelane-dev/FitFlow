import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SecaoAdmin } from '@/components/admin/SecaoAdmin';
import {
  SecaoDadosAluno,
  SecaoFrequenciaAluno,
  SecaoProfessorAluno,
  SecaoRestricaoAluno,
  SecoesAcompanhamentoAluno,
} from '@/components/admin/SecoesAluno';
import { AcoesAlunoGestao } from '@/components/gestao/AcoesAlunoGestao';
import { CabecalhoAluno } from '@/components/gestao/CabecalhoAluno';
import { CartaoMatricula } from '@/components/gestao/CartaoMatricula';
import { ModoDialogoMatricula } from '@/components/gestao/DialogoMatricula';
import { DialogosAlunoGestao, EstadoDialogoPagamento } from '@/components/gestao/DialogosAlunoGestao';
import { HistoricoEntradas } from '@/components/gestao/HistoricoEntradas';
import { ListaMatriculas } from '@/components/gestao/ListaMatriculas';
import { ListaPagamentos } from '@/components/gestao/ListaPagamentos';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { ConteudoLargo, Grade } from '@/components/ui/ConteudoLargo';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { useLarguraTela } from '@/components/ui/useLarguraTela';
import { useAdminAlunoDetalhe } from '@/hooks/useAdminAlunos';
import { useAlunoDetalhe } from '@/hooks/useAlunoDetalhe';
import { useGestaoAcoesFinanceiras } from '@/hooks/useGestaoAcoesFinanceiras';
import { useGestaoAprovacao } from '@/hooks/useGestaoAprovacao';
import { useGestaoPlanos } from '@/hooks/useGestaoPlanos';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { espacamento } from '@/theme';
import { GestaoAlunoAtualizar, PERMISSOES_RECEPCAO } from '@/types/gestao.types';
import { mostrarAlerta } from '@/utils/alerta';
import { paramTexto } from '@/utils/params';

/** Página individual do aluno para o admin: dados, situação, matrículas, pagamentos, entradas e acompanhamento. */
export default function DetalheAlunoAdmin() {
  const id = Number(paramTexto(useLocalSearchParams().id));
  const { ehMedio } = useLarguraTela();
  const d = useAdminAlunoDetalhe(id);
  const leitura = useAlunoDetalhe(id);
  const planos = useGestaoPlanos();
  const aprovacao = useGestaoAprovacao(d.recarregar);

  const [editando, setEditando] = useState(false);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);
  const [modoMatricula, setModoMatricula] = useState<ModoDialogoMatricula | null>(null);
  const [dialogoPagamento, setDialogoPagamento] = useState<EstadoDialogoPagamento | null>(null);

  const acoes = useGestaoAcoesFinanceiras(d.recarregarFinanceiro);

  const recarregarTudo = async () => {
    await Promise.all([d.recarregar(), leitura.recarregar()]);
  };

  useRecarregarNoFoco(recarregarTudo);
  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(recarregarTudo);

  const aluno = d.aluno;

  if (!aluno) {
    return (
      <Tela>
        <CabecalhoDetalhe titulo="Aluno" />
        {d.erroAluno ? <EstadoErro mensagem={d.erroAluno} aoTentarNovamente={d.recarregar} /> : <Skeleton altura={120} raio={18} />}
      </Tela>
    );
  }

  const matriculaAtual = aluno.matricula_atual;
  const podeMatricular = aluno.ativo && aluno.status_cadastro === 'aprovado';

  function confirmarStatus() {
    if (!aluno) return;

    if (!aluno.ativo) {
      aplicarStatus(true);

      return;
    }

    mostrarAlerta('Desativar aluno', `${aluno.nome} perderá o acesso ao app e à academia. Os dados e o histórico são mantidos.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desativar', style: 'destructive', onPress: () => aplicarStatus(false) },
    ]);
  }

  async function aplicarStatus(ativo: boolean) {
    const resultado = await d.alternarStatus(ativo);

    if (!resultado.ok) mostrarAlerta('Não foi possível alterar', resultado.erro);
  }

  async function salvarEdicao(dados: GestaoAlunoAtualizar) {
    setErroEdicao(null);

    const resultado = await d.atualizar(dados);

    if (!resultado.ok) {
      setErroEdicao(resultado.erro);

      return;
    }

    setEditando(false);
  }

  return (
    <Tela aoAtualizar={aoAtualizar} atualizando={atualizando} testID="detalhe-aluno-admin">
      <ConteudoLargo>
        <CabecalhoDetalhe titulo="Aluno" />

        <CabecalhoAluno
          aluno={aluno}
          acoes={
            <AcoesAlunoGestao
              aluno={aluno}
              podeEditar
              podeAprovar
              aoEditar={() => setEditando(true)}
              processando={aprovacao.processando}
              aoAprovar={() => aprovacao.aprovar(aluno)}
              aoRecusar={() => aprovacao.recusar(aluno)}
            >
              <Botao
                variante={aluno.ativo ? 'perigo' : 'primario'}
                tamanho="medio"
                icone={aluno.ativo ? 'ban' : 'checkmark-circle'}
                larguraTotal={false}
                carregando={d.processando}
                onPress={confirmarStatus}
                testID="aluno-status"
              >
                {aluno.ativo ? 'Desativar' : 'Ativar'}
              </Botao>
            </AcoesAlunoGestao>
          }
        />

        <View style={estilos.grade}>
          <Grade colunas={ehMedio ? 2 : 1} espaco={16}>
            <SecaoDadosAluno aluno={aluno} />
            <SecaoAdmin titulo="Matrícula atual" testID="aluno-matricula">
              <CartaoMatricula
                matricula={matriculaAtual}
                permissoes={PERMISSOES_RECEPCAO}
                podeMatricular={podeMatricular}
                aoMatricular={() => setModoMatricula('nova')}
                aoRenovar={() => setModoMatricula('renovar')}
                aoAlterarPlano={() => setModoMatricula('alterar')}
                aoCancelar={() => setModoMatricula('cancelar')}
              />
            </SecaoAdmin>

            <SecaoProfessorAluno aluno={aluno} professores={d.professores} processando={d.processando} aoTrocar={d.trocarProfessor} />
            <SecaoRestricaoAluno aluno={aluno} processando={d.processando} aoAlterar={d.alterarRestricao} />

            <SecaoAdmin titulo="Histórico de matrículas" testID="aluno-historico-matriculas">
              <ListaMatriculas matriculas={d.matriculas} carregando={d.secaoMatriculas.carregando} erro={d.secaoMatriculas.erro} aoTentarNovamente={d.secaoMatriculas.recarregar} />
            </SecaoAdmin>

            <SecaoAdmin
              titulo="Pagamentos"
              acao={{ rotulo: '+ AVULSO', onPress: () => setDialogoPagamento({ modo: 'avulso', pagamento: null }) }}
              testID="aluno-pagamentos"
            >
              <ListaPagamentos
                pagamentos={d.pagamentos}
                permissoes={PERMISSOES_RECEPCAO}
                carregando={d.secaoPagamentos.carregando}
                erro={d.secaoPagamentos.erro}
                aoTentarNovamente={d.secaoPagamentos.recarregar}
                aoRegistrar={(p) => setDialogoPagamento({ modo: 'registrar', pagamento: p })}
                aoEstornar={(p) => setDialogoPagamento({ modo: 'estornar', pagamento: p })}
              />
            </SecaoAdmin>

            <SecaoAdmin titulo="Entradas" subtitulo={`Últimas 10 de ${d.totalAcessos}`} testID="aluno-entradas">
              <HistoricoEntradas
                acessos={d.acessos}
                carregando={d.secaoAcessos.carregando}
                erro={d.secaoAcessos.erro}
                aoTentarNovamente={d.secaoAcessos.recarregar}
                mostrarData
                textoVazio="Nenhuma entrada registrada"
              />
            </SecaoAdmin>

            <SecaoFrequenciaAluno
              frequencia={d.frequencia}
              carregando={d.secaoFrequencia.carregando}
              erro={d.secaoFrequencia.erro}
              aoTentarNovamente={d.secaoFrequencia.recarregar}
            />

            <SecoesAcompanhamentoAluno fichas={leitura.fichas} evolucao={leitura.evolucao} avaliacoes={leitura.avaliacoes} />
          </Grade>
        </View>
      </ConteudoLargo>

      <DialogosAlunoGestao
        aluno={aluno}
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
        formulario={{ aoAtualizar: salvarEdicao, enviando: d.processando, erroGeral: erroEdicao, rotuloEnviar: 'Salvar alterações' }}
      />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  grade: { marginTop: espacamento.lg },
});
