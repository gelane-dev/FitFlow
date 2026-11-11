import { Href, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { BarraFiltros } from '@/components/ui/BarraFiltros';
import { Botao } from '@/components/ui/Botao';
import { Selo } from '@/components/ui/Selo';
import { ColunaTabela, TabelaDados } from '@/components/ui/TabelaDados';
import { cores, espacamento, tipografia } from '@/theme';
import { ProfessorGestaoItem, RecepcionistaItem } from '@/types/gestao.types';
import { filtrarPorCampos } from '@/utils/busca';

type FiltroAtivo = 'ativos' | 'inativos';

const CHIPS = [
  { valor: 'ativos', rotulo: 'Ativos' },
  { valor: 'inativos', rotulo: 'Inativos' },
];

export function SeloAtivo({ ativo }: { ativo: boolean }) {
  return <Selo rotulo={ativo ? 'Ativo' : 'Inativo'} tom={ativo ? 'sucesso' : 'neutro'} />;
}

function Pessoa({ nome, email, foto }: { nome: string; email: string; foto?: string | null }) {
  return (
    <View style={estilos.pessoa}>
      <Avatar uri={foto ?? undefined} nome={nome} tamanho={36} />
      <View style={estilos.textos}>
        <Text style={estilos.nome} numberOfLines={1}>
          {nome}
        </Text>
        <Text style={estilos.email} numberOfLines={1}>
          {email}
        </Text>
      </View>
    </View>
  );
}

interface PropsLista<T> {
  itens: T[];
  carregando: boolean;
  erro: string | null;
  aoTentarNovamente: () => void;
  aoCriar: () => void;
}

function useFiltroEquipe<T extends { nome: string; email: string; ativo: boolean }>(itens: T[]) {
  const [busca, setBusca] = useState('');
  const [chip, setChip] = useState<FiltroAtivo | null>(null);

  const filtrados = useMemo(() => {
    const porBusca = filtrarPorCampos(itens, busca, (i) => [i.nome, i.email]);

    if (chip === 'ativos') return porBusca.filter((i) => i.ativo);
    if (chip === 'inativos') return porBusca.filter((i) => !i.ativo);

    return porBusca;
  }, [itens, busca, chip]);

  return { filtrados, busca, setBusca, chip, setChip };
}

export function ListaProfessores({ itens, carregando, erro, aoTentarNovamente, aoCriar }: PropsLista<ProfessorGestaoItem>) {
  const { filtrados, setBusca, chip, setChip } = useFiltroEquipe(itens);

  const colunas: ColunaTabela<ProfessorGestaoItem>[] = [
    {
      chave: 'nome',
      titulo: 'Professor',
      peso: 3,
      principal: true,
      ordenavel: true,
      valorOrdenacao: (p) => p.nome,
      render: (p) => <Pessoa nome={p.nome} email={p.email} foto={p.foto} />,
    },
    { chave: 'telefone', titulo: 'Telefone', peso: 1.5, render: (p) => p.telefone },
    { chave: 'alunos', titulo: 'Alunos', alinhamento: 'direita', ordenavel: true, valorOrdenacao: (p) => p.total_alunos, render: (p) => `${p.total_alunos} alunos` },
    { chave: 'fichas', titulo: 'Fichas', alinhamento: 'direita', ordenavel: true, valorOrdenacao: (p) => p.total_fichas, render: (p) => `${p.total_fichas} fichas` },
    { chave: 'avaliacoes', titulo: 'Avaliações', alinhamento: 'direita', ordenavel: true, valorOrdenacao: (p) => p.total_avaliacoes, render: (p) => `${p.total_avaliacoes} avaliações` },
    { chave: 'situacao', titulo: 'Situação', render: (p) => <SeloAtivo ativo={p.ativo} /> },
  ];

  return (
    <View style={estilos.raiz}>
      <BarraFiltros
        aoBuscar={setBusca}
        placeholder="Buscar professor por nome ou e-mail"
        chips={CHIPS}
        chipAtivo={chip}
        aoMudarChip={(v) => setChip(v as FiltroAtivo | null)}
      />
      <Botao icone="add" larguraTotal={false} onPress={aoCriar} testID="botao-novo-professor">
        Novo professor
      </Botao>
      <TabelaDados
        colunas={colunas}
        dados={filtrados}
        chaveItem={(p) => p.id}
        aoPressionar={(p) => router.push(`/admin/professores/${p.id}` as Href)}
        carregando={carregando && itens.length === 0}
        erro={erro}
        aoTentarNovamente={aoTentarNovamente}
        vazio={{ titulo: itens.length === 0 ? 'Nenhum professor cadastrado' : 'Nenhum professor encontrado', icone: 'barbell-outline', descricao: itens.length === 0 ? 'Cadastre o primeiro professor para vincular alunos.' : 'Ajuste a busca ou os filtros.' }}
        ordenacaoInicial={{ chave: 'nome', direcao: 'asc' }}
        rotulo="Lista de professores"
        testID="tabela-professores"
      />
    </View>
  );
}

export function ListaRecepcionistas({ itens, carregando, erro, aoTentarNovamente, aoCriar }: PropsLista<RecepcionistaItem>) {
  const { filtrados, setBusca, chip, setChip } = useFiltroEquipe(itens);

  const colunas: ColunaTabela<RecepcionistaItem>[] = [
    {
      chave: 'nome',
      titulo: 'Recepcionista',
      peso: 3,
      principal: true,
      ordenavel: true,
      valorOrdenacao: (r) => r.nome,
      render: (r) => <Pessoa nome={r.nome} email={r.email} />,
    },
    { chave: 'telefone', titulo: 'Telefone', peso: 1.5, render: (r) => r.telefone },
    { chave: 'permissoes', titulo: 'Permissões', alinhamento: 'direita', render: (r) => `${r.permissoes.length} de 11 liberadas` },
    { chave: 'situacao', titulo: 'Situação', render: (r) => <SeloAtivo ativo={r.ativo} /> },
  ];

  return (
    <View style={estilos.raiz}>
      <BarraFiltros
        aoBuscar={setBusca}
        placeholder="Buscar recepcionista por nome ou e-mail"
        chips={CHIPS}
        chipAtivo={chip}
        aoMudarChip={(v) => setChip(v as FiltroAtivo | null)}
      />
      <Botao icone="add" larguraTotal={false} onPress={aoCriar} testID="botao-novo-recepcionista">
        Novo recepcionista
      </Botao>
      <TabelaDados
        colunas={colunas}
        dados={filtrados}
        chaveItem={(r) => r.id}
        aoPressionar={(r) => router.push(`/admin/recepcao/${r.id}` as Href)}
        carregando={carregando && itens.length === 0}
        erro={erro}
        aoTentarNovamente={aoTentarNovamente}
        vazio={{ titulo: itens.length === 0 ? 'Nenhum recepcionista cadastrado' : 'Nenhum recepcionista encontrado', icone: 'desktop-outline', descricao: itens.length === 0 ? 'Cadastre a recepção para que ela atenda os alunos.' : 'Ajuste a busca ou os filtros.' }}
        ordenacaoInicial={{ chave: 'nome', direcao: 'asc' }}
        rotulo="Lista de recepcionistas"
        testID="tabela-recepcionistas"
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { gap: espacamento.md },
  pessoa: { flexDirection: 'row', alignItems: 'center', gap: espacamento.md },
  textos: { flexShrink: 1 },
  nome: { ...tipografia.corpoForte, color: cores.texto },
  email: { ...tipografia.legenda, color: cores.textoSecundario },
});
