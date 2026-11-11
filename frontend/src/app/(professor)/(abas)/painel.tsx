import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { Cartao } from '@/components/ui/Cartao';
import { ConteudoLargo, Grade } from '@/components/ui/ConteudoLargo';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { Indicador } from '@/components/ui/Indicador';
import { LinhaLista } from '@/components/ui/LinhaLista';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { SkeletonLista } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { useLarguraTela } from '@/components/ui/useLarguraTela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useAuth } from '@/hooks/useAuth';
import { useExercicios } from '@/hooks/useExercicios';
import { usePerfil } from '@/hooks/usePerfil';
import { useProfessorDashboard } from '@/hooks/useProfessorDashboard';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { cores } from '@/theme';
import { formatarData } from '@/utils/datas';
import { primeiroNome, rotuloData } from '@/utils/saudacao';

/** Aba Início do professor (/painel): dashboard (GET /professor/dashboard), atalhos e próximas avaliações. */
export default function PainelProfessor() {
  const { ehMedio } = useLarguraTela();
  const { usuario } = useAuth();
  const { nome } = usePerfil();
  const { dashboard, carregando, erro, recarregar } = useProfessorDashboard();
  const exercicios = useExercicios(1);

  function recarregarTudo() {
    recarregar();
    exercicios.recarregar();
  }

  useRecarregarNoFoco(recarregarTudo);

  const primeiro = primeiroNome(nome);
  const carregandoInicial = carregando && !dashboard;

  return (
    <Tela abas aoAtualizar={recarregarTudo} atualizando={false}>
      <ConteudoLargo>
        <CabecalhoGrande
          rotulo={rotuloData()}
          titulo={primeiro ? `Olá, ${primeiro}` : 'Olá'}
          direita={
            <Pressionavel onPress={() => router.navigate('/perfil')} accessibilityLabel="Abrir perfil">
              <Avatar uri={usuario?.foto} nome={nome || usuario?.email} tamanho={44} />
            </Pressionavel>
          }
        />

        {erro ? (
          <EstadoErro mensagem={erro} aoTentarNovamente={recarregarTudo} />
        ) : (
          <>
            <TituloSecao titulo="Alunos" />
            <Grade colunas={ehMedio ? 4 : 2} testID="painel-indicadores-alunos">
              <Indicador
                rotulo="Alunos vinculados"
                valor={String(dashboard?.total_alunos ?? 0)}
                icone="people-outline"
                carregando={carregandoInicial}
                aoPressionar={() => router.navigate('/alunos')}
                testID="indicador-total-alunos"
              />
              <Indicador
                rotulo="Alunos ativos"
                valor={String(dashboard?.alunos_ativos ?? 0)}
                icone="checkmark-circle-outline"
                carregando={carregandoInicial}
                aoPressionar={() => router.navigate('/alunos')}
                testID="indicador-alunos-ativos"
              />
              <Indicador
                rotulo="Avaliações pendentes"
                valor={String(dashboard?.avaliacoes_pendentes ?? 0)}
                icone="clipboard-outline"
                carregando={carregandoInicial}
                testID="indicador-avaliacoes-pendentes"
              />
              <Indicador
                rotulo="Exercícios"
                valor={String(exercicios.total)}
                icone="barbell-outline"
                carregando={exercicios.carregando && exercicios.exercicios.length === 0}
                aoPressionar={() => router.navigate('/exercicios')}
                testID="indicador-exercicios"
              />
            </Grade>

            <TituloSecao
              titulo="Fichas"
              acao={{ rotulo: 'Ver fichas', onPress: () => router.navigate('/fichas') }}
            />
            <Grade colunas={ehMedio ? 3 : 2} testID="painel-indicadores-fichas">
              <Indicador
                rotulo="Fichas ativas"
                valor={String(dashboard?.fichas_ativas ?? 0)}
                icone="document-text-outline"
                carregando={carregandoInicial}
                aoPressionar={() => router.navigate('/fichas')}
                testID="indicador-fichas-ativas"
              />
              <Indicador
                rotulo="Rascunhos"
                valor={String(dashboard?.fichas_rascunho ?? 0)}
                icone="create-outline"
                carregando={carregandoInicial}
                aoPressionar={() => router.navigate('/fichas')}
                testID="indicador-fichas-rascunho"
              />
              <Indicador
                rotulo="Desatualizadas"
                valor={String(dashboard?.fichas_desatualizadas ?? 0)}
                icone="time-outline"
                carregando={carregandoInicial}
                aoPressionar={() => router.navigate('/fichas')}
                testID="indicador-fichas-desatualizadas"
              />
            </Grade>

            <TituloSecao titulo="Atalhos" />
            <View style={estilos.atalhos}>
              <View style={estilos.atalho}>
                <Botao icone="construct-outline" onPress={() => router.push('/fichas/montar' as any)}>
                  Montar ficha
                </Botao>
              </View>
              <View style={estilos.atalho}>
                <Botao icone="add-circle-outline" variante="secundario" onPress={() => router.push('/fichas/nova')}>
                  Nova ficha
                </Botao>
              </View>
              <View style={estilos.atalho}>
                <Botao
                  variante="secundario"
                  icone="barbell-outline"
                  onPress={() => router.push('/exercicios/novo')}
                >
                  Novo exercício
                </Botao>
              </View>
            </View>

            <View style={estilos.colunas}>
              <View style={estilos.coluna}>
                <TituloSecao
                  titulo="Alunos recentes"
                  acao={{ rotulo: 'Ver todos', onPress: () => router.navigate('/alunos') }}
                />
                {carregandoInicial ? (
                  <SkeletonLista linhas={3} />
                ) : !dashboard || dashboard.ultimos_alunos.length === 0 ? (
                  <EstadoVazio
                    icone="people-outline"
                    titulo="Nenhum aluno vinculado"
                    descricao="Os alunos aparecem aqui quando a recepção os vincular a você."
                  />
                ) : (
                  dashboard.ultimos_alunos.map((aluno, indice) => (
                    <LinhaLista
                      key={aluno.id}
                      titulo={aluno.nome}
                      icone="person-outline"
                      separador={indice < dashboard.ultimos_alunos.length - 1}
                      onPress={() => router.push(`/alunos/${aluno.id}`)}
                    />
                  ))
                )}
              </View>

              <View style={estilos.coluna}>
                <TituloSecao titulo="Próximas avaliações" />
                {carregandoInicial ? (
                  <SkeletonLista linhas={3} />
                ) : !dashboard || dashboard.proximas_avaliacoes.length === 0 ? (
                  <EstadoVazio
                    icone="clipboard-outline"
                    titulo="Nenhuma avaliação prevista"
                    descricao="Quando houver alunos para reavaliar, eles aparecem aqui."
                  />
                ) : (
                  dashboard.proximas_avaliacoes.map((item) => (
                    <Cartao
                      key={item.aluno.id}
                      style={estilos.avaliacao}
                      onPress={() => router.push(`/alunos/${item.aluno.id}`)}
                    >
                      <Text style={estilos.nomeAluno}>{item.aluno.nome}</Text>
                      <Text style={estilos.detalhe}>
                        Última: {item.ultima ? formatarData(item.ultima) : 'nunca avaliado'} · Próxima:{' '}
                        {item.proxima ? formatarData(item.proxima) : 'agora'}
                      </Text>
                    </Cartao>
                  ))
                )}
              </View>
            </View>
          </>
        )}
      </ConteudoLargo>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  atalhos: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  atalho: { flexGrow: 1, flexBasis: 180 },
  colunas: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 24 },
  coluna: { flexGrow: 1, flexBasis: 320, minWidth: 0 },
  avaliacao: { marginBottom: 10, gap: 4 },
  nomeAluno: { color: cores.texto, fontSize: 16, fontWeight: '700' },
  detalhe: { color: cores.textoSecundario, fontSize: 13 },
});
