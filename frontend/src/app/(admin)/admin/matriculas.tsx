import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LinkAluno } from '@/components/admin/LinkAluno';
import { DialogoMatricula, ModoDialogoMatricula } from '@/components/gestao/DialogoMatricula';
import { SeloSituacao } from '@/components/ui/SeloSituacao';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { CampoSelecao } from '@/components/ui/CampoSelecao';
import { Chip } from '@/components/ui/Chip';
import { ConteudoLargo, Grade } from '@/components/ui/ConteudoLargo';
import { Paginacao } from '@/components/ui/Paginacao';
import { ColunaTabela, TabelaDados } from '@/components/ui/TabelaDados';
import { Tela } from '@/components/ui/Tela';
import { useLarguraTela } from '@/components/ui/useLarguraTela';
import { POR_PAGINA_MATRICULAS, useAdminMatriculas } from '@/hooks/useAdminMatriculas';
import { useGestaoAcoesFinanceiras } from '@/hooks/useGestaoAcoesFinanceiras';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { espacamento } from '@/theme';
import { MatriculaResposta, SituacaoMatricula } from '@/types/gestao.types';
import { formatarData } from '@/utils/datas';
import { formatarMoeda } from '@/utils/moeda';
import { situacaoMatricula, statusMatricula } from '@/utils/situacao';

const SITUACOES: { valor: SituacaoMatricula; rotulo: string }[] = [
  { valor: 'vigente', rotulo: 'Vigentes' },
  { valor: 'vencendo', rotulo: 'Vencendo' },
  { valor: 'vencida', rotulo: 'Vencidas' },
];

/** Matrículas: lista com filtros e as ações renovar, alterar plano e cancelar. */
export default function MatriculasAdmin() {
  const lista = useAdminMatriculas();
  const { ehMedio } = useLarguraTela();
  const [acao, setAcao] = useState<{ modo: ModoDialogoMatricula; matricula: MatriculaResposta } | null>(null);
  const acoes = useGestaoAcoesFinanceiras(lista.recarregarLista);

  useRecarregarNoFoco(lista.recarregar);
  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(lista.recarregar);

  const planosAtivos = lista.planos.filter((p) => p.ativo);

  const colunas: ColunaTabela<MatriculaResposta>[] = [
    { chave: 'aluno', titulo: 'Aluno', peso: 2, principal: true, ordenavel: true, valorOrdenacao: (m) => m.aluno.nome, render: (m) => <LinkAluno id={m.aluno.id} nome={m.aluno.nome} /> },
    { chave: 'plano', titulo: 'Plano', render: (m) => m.plano.nome },
    { chave: 'inicio', titulo: 'Início', render: (m) => formatarData(m.data_inicio) },
    { chave: 'vencimento', titulo: 'Vencimento', ordenavel: true, valorOrdenacao: (m) => m.data_vencimento, render: (m) => formatarData(m.data_vencimento) },
    { chave: 'valor', titulo: 'Valor', alinhamento: 'direita', render: (m) => formatarMoeda(m.valor) },
    {
      chave: 'situacao',
      titulo: 'Situação',
      render: (m) => (
        <View style={estilos.selos}>
          <SeloSituacao info={statusMatricula(m.status)} />
          {m.status === 'ativa' ? <SeloSituacao info={situacaoMatricula(m.situacao)} /> : null}
        </View>
      ),
    },
    {
      chave: 'acoes',
      titulo: 'Ações',
      acoes: true,
      render: (m) =>
        m.status === 'ativa' ? (
          <View style={estilos.acoes}>
            <Botao tamanho="medio" icone="refresh" larguraTotal={false} onPress={() => setAcao({ modo: 'renovar', matricula: m })} accessibilityLabel={`Renovar matrícula de ${m.aluno.nome}`} testID={`renovar-${m.id}`}>
              Renovar
            </Botao>
            <Botao tamanho="medio" variante="secundario" icone="swap-horizontal" larguraTotal={false} onPress={() => setAcao({ modo: 'alterar', matricula: m })} accessibilityLabel={`Alterar plano de ${m.aluno.nome}`} testID={`alterar-${m.id}`}>
              Alterar
            </Botao>
            <Botao tamanho="medio" variante="perigo" larguraTotal={false} onPress={() => setAcao({ modo: 'cancelar', matricula: m })} accessibilityLabel={`Cancelar matrícula de ${m.aluno.nome}`} testID={`cancelar-${m.id}`}>
              Cancelar
            </Botao>
          </View>
        ) : null,
    },
  ];

  const statusAtivo = lista.filtros.status === 'ativa';

  return (
    <Tela aoAtualizar={aoAtualizar} atualizando={atualizando} testID="matriculas-admin">
      <ConteudoLargo>
        <CabecalhoDetalhe titulo="Matrículas" />

        <View style={estilos.chips}>
          <Chip rotulo="Ativas" selecionado={statusAtivo} onPress={() => lista.definirFiltros({ status: statusAtivo ? null : 'ativa' })} />
          <Chip rotulo="Canceladas" selecionado={lista.filtros.status === 'cancelada'} onPress={() => lista.definirFiltros({ status: lista.filtros.status === 'cancelada' ? null : 'cancelada' })} />
          <Chip rotulo="Encerradas" selecionado={lista.filtros.status === 'encerrada'} onPress={() => lista.definirFiltros({ status: lista.filtros.status === 'encerrada' ? null : 'encerrada' })} />
          {SITUACOES.map((s) => (
            <Chip
              key={s.valor}
              rotulo={s.rotulo}
              selecionado={lista.filtros.situacao === s.valor}
              onPress={() => lista.definirFiltros({ situacao: lista.filtros.situacao === s.valor ? null : s.valor })}
            />
          ))}
        </View>

        <View style={estilos.selecao}>
          <Grade colunas={ehMedio ? 3 : 1} espaco={12}>
            <CampoSelecao
              rotulo="Plano"
              opcoes={lista.planos.map((p) => ({ valor: p.id, rotulo: p.nome, descricao: p.ativo ? undefined : 'Inativo' }))}
              valor={lista.filtros.planoId}
              aoMudar={(planoId) => lista.definirFiltros({ planoId })}
              placeholder="Todos"
              limpavel
              testID="filtro-plano"
            />
          </Grade>
        </View>

        <TabelaDados
          rotulo="Lista de matrículas"
          colunas={colunas}
          dados={lista.matriculas}
          chaveItem={(m) => m.id}
          carregando={lista.carregando && lista.matriculas.length === 0}
          erro={lista.erro}
          aoTentarNovamente={lista.recarregar}
          vazio={{ titulo: 'Nenhuma matrícula encontrada', descricao: 'Ajuste os filtros ou matricule um aluno pela página dele.', icone: 'document-text-outline' }}
          testID="tabela-matriculas"
        />
        <Paginacao total={lista.total} tamanhoPagina={POR_PAGINA_MATRICULAS} pagina={lista.filtros.pagina} aoMudarPagina={lista.mudarPagina} carregando={lista.carregando} />
      </ConteudoLargo>

      <DialogoMatricula
        visivel={acao !== null}
        modo={acao?.modo ?? 'renovar'}
        aluno={acao?.matricula.aluno ?? { id: 0, nome: '' }}
        matricula={acao?.matricula}
        planos={planosAtivos}
        carregandoPlanos={false}
        aoFechar={() => setAcao(null)}
        aoConfirmar={async (resultado) => {
          const erro = await acoes.executarMatricula(resultado, acao?.matricula.id);

          if (!erro) setAcao(null);

          return erro;
        }}
      />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espacamento.sm, marginBottom: espacamento.md },
  selecao: { marginBottom: espacamento.md },
  selos: { gap: 4, alignItems: 'flex-start' },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espacamento.sm },
});
