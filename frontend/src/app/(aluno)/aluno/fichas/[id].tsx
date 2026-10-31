import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ItemTreinoAluno } from '@/components/aluno/ItemTreinoAluno';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { Selo } from '@/components/ui/Selo';
import { SkeletonLista } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { useMinhasFichaCompleta } from '@/hooks/useMinhasFichaCompleta';
import { cores, fonteDisplay } from '@/theme';
import { estimarDuracaoMin } from '@/utils/painelAluno';
import { descreverTreino } from '@/utils/pluralizacao';
import { rotaPreviaTreino } from '@/utils/rotas';
import { descreverVigencia } from '@/utils/vigencia';

export default function FichaAluno() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ficha, carregando, erro, recarregar } = useMinhasFichaCompleta(Number(id));

  return (
    <Tela>
      <CabecalhoDetalhe titulo={ficha?.nome ?? 'Ficha'} />

      {carregando ? (
        <SkeletonLista linhas={4} />
      ) : erro ? (
        <EstadoErro mensagem={erro} aoTentarNovamente={recarregar} />
      ) : !ficha || ficha.treinos.length === 0 ? (
        <EstadoVazio icone="barbell-outline" titulo="Esta ficha ainda não tem treinos" />
      ) : (
        <>
          {ficha.professor_nome ? (
            <Text style={estilos.professor}>Professor: {ficha.professor_nome}</Text>
          ) : null}
          <Text style={estilos.vigencia}>{descreverVigencia(ficha.data_inicio, ficha.data_fim)}</Text>

          {ficha.treinos.map((treino) => {
            const duracao = estimarDuracaoMin(treino.itens);

            return (
              <View key={treino.id} style={estilos.treino}>
                <View style={estilos.cabecalhoTreino}>
                  <Text style={estilos.treinoTitulo}>{treino.nome}</Text>
                  <Selo rotulo={treino.dia_semana} tom="primario" />
                </View>
                <Text style={estilos.treinoMeta}>{descreverTreino(treino.itens.length, duracao)}</Text>

                {treino.itens.length === 0 ? (
                  <Text style={estilos.vazio}>Sem exercícios neste treino.</Text>
                ) : (
                  treino.itens.map((item) => <ItemTreinoAluno key={item.id} item={item} />)
                )}

                <Botao icone="play" onPress={() => router.push(rotaPreviaTreino(treino))}>
                  Ver e iniciar este treino
                </Botao>
              </View>
            );
          })}
        </>
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  professor: { color: cores.texto, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  vigencia: { color: cores.textoSecundario, fontSize: 14, marginBottom: 20 },
  treino: { marginBottom: 36 },
  cabecalhoTreino: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  treinoTitulo: { flex: 1, color: cores.texto, fontFamily: fonteDisplay, fontSize: 22, lineHeight: 28 },
  treinoMeta: { color: cores.textoSecundario, fontSize: 13, marginTop: 4, marginBottom: 14 },
  vazio: { color: cores.textoSecundario, fontSize: 14, marginBottom: 12 },
});
