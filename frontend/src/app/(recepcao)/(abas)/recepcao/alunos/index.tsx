import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ListaAlunosGestao } from '@/components/gestao/ListaAlunosGestao';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { ConteudoLargo } from '@/components/ui/ConteudoLargo';
import { Tela } from '@/components/ui/Tela';
import { useGestaoAprovacao } from '@/hooks/useGestaoAprovacao';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { POR_PAGINA_ALUNOS, useRecepcaoAlunos } from '@/hooks/useRecepcaoAlunos';
import { useRecepcaoPermissoes } from '@/hooks/useRecepcaoPermissoes';
import type { GestaoAlunoItem, SituacaoAluno } from '@/types/gestao.types';

const CHIPS = [
  { valor: 'pendente', rotulo: 'Pendentes de aprovação' },
  { valor: 'vigente', rotulo: 'Vigentes' },
  { valor: 'vencendo', rotulo: 'Vencendo' },
  { valor: 'vencida', rotulo: 'Vencidas' },
  { valor: 'sem_matricula', rotulo: 'Sem matrícula' },
  { valor: 'inadimplente', rotulo: 'Inadimplentes' },
  { valor: 'desativado', rotulo: 'Desativados' },
];

export default function AlunosRecepcao() {
  const lista = useRecepcaoAlunos();
  const { pode } = useRecepcaoPermissoes();
  const { aprovar, recusar, processando } = useGestaoAprovacao(lista.recarregar);

  useRecarregarNoFoco(lista.recarregar);

  const podeAprovar = pode('aprovar_aluno');

  const renderAcoes = (a: GestaoAlunoItem) =>
    podeAprovar && a.status_cadastro === 'pendente' ? (
      <View style={estilos.acoes}>
        <Botao tamanho="pequeno" larguraTotal={false} icone="checkmark" disabled={processando === a.id} onPress={() => aprovar(a)} testID={`aprovar-${a.id}`}>
          Aprovar
        </Botao>
        <Botao tamanho="pequeno" larguraTotal={false} variante="perigo" disabled={processando === a.id} onPress={() => recusar(a)} testID={`recusar-${a.id}`}>
          Recusar
        </Botao>
      </View>
    ) : null;

  return (
    <Tela abas aoAtualizar={lista.recarregar} testID="tela-alunos">
      <CabecalhoGrande
        rotulo="Cadastro"
        titulo="Alunos"
        direita={
          pode('cadastrar_aluno') ? (
            <Botao
              tamanho="medio"
              larguraTotal={false}
              icone="person-add"
              onPress={() => router.push('/recepcao/alunos/novo' as never)}
              testID="botao-novo-aluno"
            >
              Novo aluno
            </Botao>
          ) : undefined
        }
      />

      <ConteudoLargo>
        <ListaAlunosGestao
          alunos={lista.alunos}
          carregando={lista.carregando}
          erro={lista.erro}
          aoTentarNovamente={lista.recarregar}
          aoAbrir={(a) => router.push(`/recepcao/alunos/${a.id}` as never)}
          colunaContato="telefone"
          renderAcoes={renderAcoes}
          aoBuscar={lista.setBusca}
          chips={CHIPS}
          chipAtivo={lista.situacao}
          aoMudarChip={(v) => lista.setSituacao(v as SituacaoAluno | null)}
          vazio={{
            titulo: lista.situacao === 'pendente' ? 'Nenhum cadastro pendente' : 'Nenhum aluno encontrado',
            descricao: 'Ajuste a busca ou os filtros.',
          }}
          total={lista.total}
          tamanhoPagina={POR_PAGINA_ALUNOS}
          pagina={lista.pagina}
          aoMudarPagina={lista.setPagina}
        />
      </ConteudoLargo>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  acoes: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
