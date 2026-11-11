import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Paginacao } from '@/components/ui/Paginacao';
import { SeloSituacao } from '@/components/ui/SeloSituacao';
import { ColunaTabela, TabelaDados } from '@/components/ui/TabelaDados';
import { cores, tipografia } from '@/theme';
import type { PagamentoResposta } from '@/types/gestao.types';
import { formatarData } from '@/utils/datas';
import { formatarMoeda } from '@/utils/moeda';
import { dinheiroParaNumero } from '@/utils/painelAdmin';
import { formaPagamento, statusPagamento } from '@/utils/situacao';

export interface ListaPagamentosGestaoProps {
  pagamentos: PagamentoResposta[];
  carregando?: boolean;
  erro?: string | null;
  aoTentarNovamente?: () => void;
  /** Conteúdo da coluna "Aluno" (nome, link para o aluno...). */
  renderAluno: (pagamento: PagamentoResposta) => ReactNode;
  /** Mostra a descrição em coluna própria (admin); sem isso o chamador a coloca em `renderAluno`. */
  colunaDescricao?: boolean;
  /** Título da coluna de situação ("Situação" no admin, "Status" na recepção). */
  tituloStatus?: string;
  /** Mostra "Motivo: ..." sob o selo de pagamentos estornados. */
  mostrarMotivoEstorno?: boolean;
  /** Botões da coluna "Ações" (por pagamento); `null` deixa a célula vazia. */
  renderAcoes: (pagamento: PagamentoResposta) => ReactNode;
  alinhamentoAcoes?: 'esquerda' | 'direita';
  vazio: { titulo: string; descricao: string };
  total: number;
  tamanhoPagina: number;
  pagina: number;
  aoMudarPagina: (pagina: number) => void;
}

/** Tabela paginada de pagamentos da gestão; as ações por linha variam por papel (receber, comprovante, estornar). */
export function ListaPagamentosGestao({
  pagamentos,
  carregando,
  erro,
  aoTentarNovamente,
  renderAluno,
  colunaDescricao = false,
  tituloStatus = 'Status',
  mostrarMotivoEstorno = false,
  renderAcoes,
  alinhamentoAcoes,
  vazio,
  total,
  tamanhoPagina,
  pagina,
  aoMudarPagina,
}: ListaPagamentosGestaoProps) {
  const colunas: ColunaTabela<PagamentoResposta>[] = [
    {
      chave: 'aluno',
      titulo: 'Aluno',
      principal: true,
      peso: 2,
      ordenavel: true,
      valorOrdenacao: (p) => p.aluno.nome,
      render: renderAluno,
    },
    ...(colunaDescricao ? [{ chave: 'descricao', titulo: 'Descrição', peso: 2, render: (p: PagamentoResposta) => p.descricao }] : []),
    {
      chave: 'valor',
      titulo: 'Valor',
      alinhamento: 'direita',
      ordenavel: true,
      valorOrdenacao: (p) => dinheiroParaNumero(p.valor),
      render: (p) => formatarMoeda(p.valor),
    },
    {
      chave: 'vencimento',
      titulo: 'Vencimento',
      ordenavel: true,
      valorOrdenacao: (p) => p.vencimento,
      render: (p) => formatarData(p.vencimento),
    },
    { chave: 'forma', titulo: 'Forma', render: (p) => (p.forma ? formaPagamento(p.forma).rotulo : '—') },
    {
      chave: 'status',
      titulo: tituloStatus,
      render: (p) => (
        <View style={estilos.status}>
          <SeloSituacao info={statusPagamento(p.status)} />
          {mostrarMotivoEstorno && p.motivo_estorno ? <Text style={estilos.motivo}>Motivo: {p.motivo_estorno}</Text> : null}
        </View>
      ),
    },
    { chave: 'acoes', titulo: 'Ações', acoes: true, alinhamento: alinhamentoAcoes, render: renderAcoes },
  ];

  return (
    <>
      <TabelaDados
        rotulo="Lista de pagamentos"
        colunas={colunas}
        dados={pagamentos}
        chaveItem={(p) => p.id}
        carregando={carregando}
        erro={erro}
        aoTentarNovamente={aoTentarNovamente}
        vazio={{ ...vazio, icone: 'card-outline' }}
        testID="tabela-pagamentos"
      />

      <Paginacao total={total} tamanhoPagina={tamanhoPagina} pagina={pagina} aoMudarPagina={aoMudarPagina} carregando={carregando} />
    </>
  );
}

const estilos = StyleSheet.create({
  status: { gap: 4 },
  motivo: { ...tipografia.legenda, color: cores.textoSecundario },
});
