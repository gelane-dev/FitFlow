import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { VideoPlayerExercicio } from '@/components/exercicios/VideoPlayerExercicio';
import { Cartao } from '@/components/ui/Cartao';
import { Selo } from '@/components/ui/Selo';
import { cores, raios } from '@/theme';
import { ItemFichaAluno } from '@/types/fichaAluno.types';
import { formatarNumero } from '@/utils/evolucao';

type ItemTreinoAlunoProps = {
  item: ItemFichaAluno;
};

/** Exercício de um treino: mídia, nome, grupo muscular e a prescrição em destaque. */
export function ItemTreinoAluno({ item }: ItemTreinoAlunoProps) {
  return (
    <Cartao style={estilos.cartao}>
      <View style={estilos.topo}>
        <Text style={estilos.nome}>{item.nome ?? `Exercício ${item.exercicio_id}`}</Text>
        {!!item.grupo_muscular && <Selo rotulo={item.grupo_muscular} tom="neutro" />}
      </View>

      <View style={estilos.prescricao}>
        <Text style={estilos.destaque}>
          {item.series} × {item.repeticoes}
        </Text>
        <Text style={estilos.detalhe}>
          {formatarNumero(item.carga)} kg · descanso {item.descanso}s
        </Text>
      </View>

      {!!item.imagem && (
        <Image source={{ uri: item.imagem }} style={estilos.imagem} contentFit="cover" />
      )}

      {!!item.video && <VideoPlayerExercicio uri={item.video} />}
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  cartao: { marginBottom: 12 },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nome: { flex: 1, color: cores.texto, fontSize: 17, fontWeight: '700' },
  prescricao: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 8, marginBottom: 12 },
  destaque: { color: cores.primaria, fontSize: 20, fontWeight: '700' },
  detalhe: { color: cores.textoSecundario, fontSize: 14 },
  imagem: {
    width: '100%',
    height: 180,
    borderRadius: raios.botao,
    backgroundColor: cores.superficieElevada,
    marginBottom: 4,
  },
});
