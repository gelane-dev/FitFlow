import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BarraFiltros, FiltroChip } from '@/components/ui/BarraFiltros';
import { Paginacao } from '@/components/ui/Paginacao';
import { SeloSituacao } from '@/components/ui/SeloSituacao';
import { ColunaTabela, TabelaDados } from '@/components/ui/TabelaDados';
import { cores, tipografia } from '@/theme';
import type { GestaoAlunoItem } from '@/types/gestao.types';
import { formatarData } from '@/utils/datas';
import { situacaoPrincipalAluno } from '@/utils/gestaoRecepcao';
import { situacaoAluno, statusCadastro } from '@/utils/situacao';

export interface ListaAlunosGestaoProps {
  alunos: GestaoAlunoItem[];
  carregando?: boolean;
  erro?: string | null;
  aoTentarNovamente?: () => void;
  aoAbrir: (aluno: GestaoAlunoItem) => void;
  /** Coluna após o nome: professor (admin) ou telefone (recepção). */
  colunaContato: 'professor' | 'telefone';
  /** Botões da última coluna ("Ações"); sem esta prop a coluna não existe. */
  renderAcoes?: (aluno: GestaoAlunoItem) => ReactNode;
  chips: FiltroChip[];
  chipAtivo: string | null;
  aoMudarChip: (valor: string | null) => void;
  aoBuscar: (busca: string) => void;
  /** Conteúdo entre a barra de filtros e a tabela (ex.: seletores de professor e plano). */
  filtrosExtras?: ReactNode;
  vazio: { titulo: string; descricao: string };
  total: number;
  tamanhoPagina: number;
  pagina: number;
  aoMudarPagina: (pagina: number) => void;
}

/** Lista paginada de alunos da gestão (busca, chips de situação, tabela e paginação); as ações variam por papel. */
export function ListaAlunosGestao({
  alunos,
  carregando,
  erro,
  aoTentarNovamente,
  aoAbrir,
  colunaContato,
  renderAcoes,
  chips,
  chipAtivo,
  aoMudarChip,
  aoBuscar,
  filtrosExtras,
  vazio,
  total,
  tamanhoPagina,
  pagina,
  aoMudarPagina,
}: ListaAlunosGestaoProps) {
  const colunas: ColunaTabela<GestaoAlunoItem>[] = [
    {
      chave: 'nome',
      titulo: 'Aluno',
      principal: true,
      peso: renderAcoes ? 2 : 2.5,
      ordenavel: true,
      valorOrdenacao: (a) => a.nome,
      render: (a) => (
        <View>
          <Text style={estilos.nome}>{a.nome}</Text>
          <Text style={estilos.sub}>{a.email}</Text>
        </View>
      ),
    },
    colunaContato === 'professor'
      ? { chave: 'professor', titulo: 'Professor', peso: 1.5, render: (a) => a.professor?.nome ?? 'Sem professor' }
      : { chave: 'telefone', titulo: 'Telefone', render: (a) => a.telefone },
    { chave: 'plano', titulo: 'Plano', render: (a) => a.plano_atual?.nome ?? '—' },
    {
      chave: 'vencimento',
      titulo: 'Vencimento',
      ordenavel: true,
      valorOrdenacao: (a) => a.data_vencimento ?? '',
      render: (a) => (a.data_vencimento ? formatarData(a.data_vencimento) : '—'),
    },
    {
      chave: 'situacao',
      titulo: 'Situação',
      render: (a) => {
        const codigo = situacaoPrincipalAluno(a);

        return (
          <View style={estilos.selos}>
            <SeloSituacao info={codigo === 'recusado' ? statusCadastro('recusado') : situacaoAluno(codigo)} />
            {a.inadimplente ? <SeloSituacao info={situacaoAluno('inadimplente')} /> : null}
          </View>
        );
      },
    },
  ];

  if (renderAcoes) {
    colunas.push({ chave: 'acoes', titulo: 'Ações', acoes: true, render: (a) => renderAcoes(a) });
  }

  return (
    <>
      <BarraFiltros
        aoBuscar={aoBuscar}
        placeholder="Buscar por nome, e-mail, telefone ou CPF"
        chips={chips}
        chipAtivo={chipAtivo}
        aoMudarChip={aoMudarChip}
      />

      {filtrosExtras}

      <TabelaDados
        rotulo="Lista de alunos"
        colunas={colunas}
        dados={alunos}
        chaveItem={(a) => a.id}
        aoPressionar={aoAbrir}
        carregando={carregando}
        erro={erro}
        aoTentarNovamente={aoTentarNovamente}
        vazio={{ ...vazio, icone: 'people-outline' }}
        testID="tabela-alunos"
      />

      <Paginacao total={total} tamanhoPagina={tamanhoPagina} pagina={pagina} aoMudarPagina={aoMudarPagina} carregando={carregando} />
    </>
  );
}

const estilos = StyleSheet.create({
  nome: { ...tipografia.corpoForte, color: cores.texto },
  sub: { ...tipografia.legenda, color: cores.textoSecundario },
  selos: { gap: 4, alignItems: 'flex-start' },
});
