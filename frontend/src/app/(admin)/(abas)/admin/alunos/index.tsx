import { Href, router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListaAlunosGestao } from '@/components/gestao/ListaAlunosGestao';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { CampoSelecao } from '@/components/ui/CampoSelecao';
import { ConteudoLargo, Grade } from '@/components/ui/ConteudoLargo';
import { Tela } from '@/components/ui/Tela';
import { useLarguraTela } from '@/components/ui/useLarguraTela';
import { FILTRO_SEM_PROFESSOR, POR_PAGINA_ALUNOS, useAdminAlunos } from '@/hooks/useAdminAlunos';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { espacamento } from '@/theme';
import { SituacaoAluno } from '@/types/gestao.types';

const CHIPS = [
  { valor: 'pendente', rotulo: 'Pendentes' },
  { valor: 'vigente', rotulo: 'Vigentes' },
  { valor: 'vencendo', rotulo: 'Vencendo' },
  { valor: 'vencida', rotulo: 'Vencidas' },
  { valor: 'sem_matricula', rotulo: 'Sem matrícula' },
  { valor: 'inadimplente', rotulo: 'Inadimplentes' },
  { valor: 'desativado', rotulo: 'Desativados' },
];

/** Alunos (admin): busca, filtros de situação, professor e plano, com paginação. */
export default function AlunosAdmin() {
  const lista = useAdminAlunos();
  const { ehMedio } = useLarguraTela();

  useRecarregarNoFoco(lista.recarregar);
  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(lista.recarregar);

  const opcoesProfessor = useMemo(
    () => [
      { valor: FILTRO_SEM_PROFESSOR, rotulo: 'Sem professor' },
      ...lista.professores.map((p) => ({ valor: p.id, rotulo: p.nome, descricao: p.ativo ? undefined : 'Inativo' })),
    ],
    [lista.professores]
  );
  const opcoesPlano = useMemo(
    () => lista.planos.map((p) => ({ valor: p.id, rotulo: p.nome, descricao: p.ativo ? undefined : 'Inativo' })),
    [lista.planos]
  );

  return (
    <Tela abas aoAtualizar={aoAtualizar} atualizando={atualizando} testID="alunos-admin">
      <ConteudoLargo>
        <CabecalhoGrande
          rotulo="Administração"
          titulo="Alunos"
          direita={
            <Botao tamanho="medio" larguraTotal={false} icone="person-add" onPress={() => router.push('/admin/alunos/novo' as Href)} testID="botao-novo-aluno">
              Novo aluno
            </Botao>
          }
        />

        <ListaAlunosGestao
          alunos={lista.alunos}
          carregando={lista.carregando && lista.alunos.length === 0}
          erro={lista.erro}
          aoTentarNovamente={lista.recarregar}
          aoAbrir={(a) => router.push(`/admin/alunos/${a.id}` as Href)}
          colunaContato="professor"
          aoBuscar={(busca) => lista.definirFiltros({ busca })}
          chips={CHIPS}
          chipAtivo={lista.filtros.situacao}
          aoMudarChip={(valor) => lista.definirFiltros({ situacao: valor as SituacaoAluno | null })}
          vazio={{
            titulo: lista.filtrosAtivos ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado',
            descricao: lista.filtrosAtivos ? 'Ajuste a busca ou os filtros.' : 'Cadastre o primeiro aluno para começar.',
          }}
          total={lista.total}
          tamanhoPagina={POR_PAGINA_ALUNOS}
          pagina={lista.filtros.pagina}
          aoMudarPagina={lista.mudarPagina}
          filtrosExtras={
              <View style={estilos.selecoes}>
                <Grade colunas={ehMedio ? 3 : 1} espaco={12}>
                  <CampoSelecao
                    rotulo="Professor"
                    opcoes={opcoesProfessor}
                    valor={lista.filtros.professorId}
                    aoMudar={(professorId) => lista.definirFiltros({ professorId })}
                    placeholder="Todos"
                    limpavel
                    testID="filtro-professor"
                  />
                  <CampoSelecao
                    rotulo="Plano"
                    opcoes={opcoesPlano}
                    valor={lista.filtros.planoId}
                    aoMudar={(planoId) => lista.definirFiltros({ planoId })}
                    placeholder="Todos"
                    limpavel
                    testID="filtro-plano"
                  />
                  {lista.filtrosAtivos ? (
                    <View style={estilos.limpar}>
                      <Botao variante="secundario" tamanho="medio" icone="close" larguraTotal={false} onPress={lista.limparFiltros} testID="filtro-limpar-tudo">
                        Limpar filtros
                      </Botao>
                    </View>
                  ) : (
                    <View />
                  )}
                </Grade>
              </View>
          }
        />
      </ConteudoLargo>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  selecoes: { marginTop: espacamento.md, marginBottom: espacamento.md },
  limpar: { justifyContent: 'flex-end', flex: 1 },
});
