import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { BlocoEstatistica } from '@/components/ui/BlocoEstatistica';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { Cartao } from '@/components/ui/Cartao';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { LinhaLista } from '@/components/ui/LinhaLista';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { Skeleton, SkeletonLista } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { useAlunos } from '@/hooks/useAlunos';
import { useAuth } from '@/hooks/useAuth';
import { useExercicios } from '@/hooks/useExercicios';
import { useFichas } from '@/hooks/useFichas';
import { usePerfil } from '@/hooks/usePerfil';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { primeiroNome, rotuloData } from '@/utils/saudacao';

const ALUNOS_RECENTES = 5;

/** Aba Início do professor (/painel): estatísticas, atalhos e alunos recentes. */
export default function PainelProfessor() {
  const { usuario } = useAuth();
  const { nome } = usePerfil();
  const alunos = useAlunos();
  const fichas = useFichas();
  const exercicios = useExercicios(1);

  const carregando = alunos.carregando || fichas.carregando || exercicios.carregando;
  const erro = alunos.erro ?? fichas.erro ?? exercicios.erro;
  const fichasVigentes = fichas.fichas.filter((f) => f.vigente).length;
  const recentes = [...alunos.alunos].sort((a, b) => b.id - a.id).slice(0, ALUNOS_RECENTES);

  function recarregarTudo() {
    alunos.recarregar();
    fichas.recarregar();
    exercicios.recarregar();
  }

  useRecarregarNoFoco(recarregarTudo);

  const primeiro = primeiroNome(nome);

  return (
    <Tela abas aoAtualizar={recarregarTudo} atualizando={false}>
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
          <Cartao>
            {carregando ? (
              <View style={estilos.estatisticas}>
                <Skeleton altura={50} />
                <Skeleton altura={50} />
                <Skeleton altura={50} />
              </View>
            ) : (
              <View style={estilos.estatisticas}>
                <BlocoEstatistica valor={alunos.alunos.length} rotulo="Alunos" destaque />
                <BlocoEstatistica valor={fichasVigentes} rotulo="Vigentes" />
                <BlocoEstatistica valor={exercicios.total} rotulo="Exercícios" />
              </View>
            )}
          </Cartao>

          <TituloSecao titulo="Atalhos" />
          <View style={estilos.atalhos}>
            <View style={estilos.atalho}>
              <Botao icone="add-circle-outline" onPress={() => router.push('/fichas/nova')}>
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

          <TituloSecao
            titulo="Alunos recentes"
            acao={{ rotulo: 'Ver todos', onPress: () => router.navigate('/alunos') }}
          />

          {carregando ? (
            <SkeletonLista linhas={3} />
          ) : recentes.length === 0 ? (
            <EstadoVazio
              icone="people-outline"
              titulo="Nenhum aluno cadastrado"
              descricao="Os alunos aparecem aqui assim que criarem a conta pelo app."
            />
          ) : (
            recentes.map((aluno, indice) => (
              <LinhaLista
                key={aluno.id}
                titulo={aluno.nome}
                subtitulo={aluno.telefone}
                icone="person-outline"
                separador={indice < recentes.length - 1}
                onPress={() => router.push(`/alunos/${aluno.id}`)}
              />
            ))
          )}
        </>
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  estatisticas: { flexDirection: 'row', gap: 16 },
  atalhos: { flexDirection: 'row', gap: 12 },
  atalho: { flex: 1 },
});
