import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { router } from 'expo-router';

import { Avatar } from '@/components/ui/Avatar';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { SkeletonLista } from '@/components/ui/Skeleton';
import { TelaLista } from '@/components/ui/TelaLista';
import { useAlunos } from '@/hooks/useAlunos';
import { useFichas } from '@/hooks/useFichas';
import { usePuxarParaAtualizar } from '@/hooks/usePuxarParaAtualizar';
import { useRecarregarNoFoco } from '@/hooks/useRecarregarNoFoco';
import { cores } from '@/theme';
import { filtrarPorNome } from '@/utils/busca';

/** Aba Alunos do professor (/alunos): lista virtualizada com busca local e ficha vigente. */
export default function Alunos() {
  const { alunos, carregando, erro, recarregar } = useAlunos();
  const fichas = useFichas();
  const [busca, setBusca] = useState('');

  function recarregarTudo() {
    return Promise.all([recarregar(), fichas.recarregar()]);
  }

  useRecarregarNoFoco(recarregarTudo);
  const { atualizando, aoAtualizar } = usePuxarParaAtualizar(recarregarTudo);

  const filtrados = filtrarPorNome(alunos, busca);
  const primeiraCarga = carregando && alunos.length === 0;

  function fichaVigenteDe(alunoId: number): string | null {
    return fichas.fichas.find((f) => f.aluno_id === alunoId && f.vigente)?.nome ?? null;
  }

  const cabecalho = (
    <>
      <CabecalhoGrande
        rotulo={`${alunos.length} ALUNO${alunos.length === 1 ? '' : 'S'}`}
        titulo="Alunos"
      />

      <CampoTexto
        icone="search-outline"
        placeholder="Buscar por nome"
        value={busca}
        onChangeText={setBusca}
        autoCorrect={false}
      />
    </>
  );

  const vazio = erro ? (
    <EstadoErro mensagem={erro} aoTentarNovamente={recarregarTudo} />
  ) : primeiraCarga ? (
    <SkeletonLista linhas={6} />
  ) : (
    <EstadoVazio
      icone="people-outline"
      titulo={alunos.length === 0 ? 'Nenhum aluno cadastrado' : 'Nenhum aluno encontrado'}
      descricao={
        alunos.length === 0
          ? 'Os alunos aparecem aqui assim que criarem a conta pelo app.'
          : 'Tente buscar por outro nome.'
      }
    />
  );

  return (
    <TelaLista
      abas
      dados={erro ? [] : filtrados}
      chave={(aluno) => aluno.id.toString()}
      cabecalho={cabecalho}
      vazio={vazio}
      aoAtualizar={aoAtualizar}
      atualizando={atualizando}
      renderItem={({ item: aluno, index: indice }) => {
        const ficha = fichaVigenteDe(aluno.id);

        return (
          <Pressionavel
            escala={0.99}
            onPress={() => router.push(`/alunos/${aluno.id}`)}
            style={[estilos.linha, indice < filtrados.length - 1 && estilos.separador]}
            accessibilityRole="button"
            accessibilityLabel={`Abrir aluno ${aluno.nome}`}
          >
            <Avatar nome={aluno.nome} tamanho={48} />

            <View style={estilos.textos}>
              <Text style={estilos.nome} numberOfLines={1}>
                {aluno.nome}
              </Text>
              <Text style={estilos.telefone} numberOfLines={1}>
                {aluno.telefone}
              </Text>
              <Text style={[estilos.ficha, !ficha && estilos.semFicha]} numberOfLines={1}>
                {ficha ? `Ficha vigente: ${ficha}` : 'Sem ficha vigente'}
              </Text>
            </View>
          </Pressionavel>
        );
      }}
    />
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  separador: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: cores.borda },
  textos: { flex: 1 },
  nome: { color: cores.texto, fontSize: 16, fontWeight: '600' },
  telefone: { color: cores.textoSecundario, fontSize: 13, marginTop: 2 },
  ficha: { color: cores.primaria, fontSize: 12, fontWeight: '600', marginTop: 4 },
  semFicha: { color: cores.textoTerciario, fontWeight: '400' },
});
