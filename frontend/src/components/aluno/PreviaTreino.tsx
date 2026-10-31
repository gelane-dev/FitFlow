import { StyleSheet, Text, View } from 'react-native';

import { BlocoEstatistica } from '@/components/ui/BlocoEstatistica';
import { Cartao } from '@/components/ui/Cartao';
import { LinhaLista } from '@/components/ui/LinhaLista';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { cores, fonteDisplay } from '@/theme';
import { TreinoAluno } from '@/types/fichaAluno.types';
import { formatarNumero } from '@/utils/evolucao';
import { estimarDuracaoMin } from '@/utils/painelAluno';
import { comUnidade, inicialMaiuscula, plural } from '@/utils/pluralizacao';

type PreviaTreinoProps = {
  treino: TreinoAluno;
};

/** Total de séries do treino (soma das séries de cada item). */
export function totalSeriesDoTreino(treino: Pick<TreinoAluno, 'itens'>): number {
  return treino.itens.reduce((total, item) => total + Math.max(0, item.series), 0);
}

/** Pré-visualização do treino: exercícios, séries e tempo estimado, antes de começar. */
export function PreviaTreino({ treino }: PreviaTreinoProps) {
  const itens = [...treino.itens].sort((a, b) => a.ordem - b.ordem);
  const duracao = estimarDuracaoMin(itens);
  const series = totalSeriesDoTreino(treino);

  return (
    <View testID="previa-treino">
      <Text style={estilos.dia}>{inicialMaiuscula(treino.dia_semana)}</Text>
      <Text style={estilos.titulo}>{treino.nome}</Text>

      <Cartao style={estilos.estatisticas}>
        <BlocoEstatistica valor={itens.length} rotulo={plural(itens.length, 'Exercício')} destaque />
        <BlocoEstatistica valor={series} rotulo={plural(series, 'Série')} />
        <BlocoEstatistica
          valor={duracao > 0 ? `~${duracao}` : '—'}
          unidade={duracao > 0 ? 'min' : undefined}
          rotulo="Tempo"
        />
      </Cartao>

      <TituloSecao titulo="Exercícios" />
      {itens.map((item, indice) => (
        <LinhaLista
          key={item.id}
          testID={`previa-exercicio-${indice}`}
          titulo={`${indice + 1}. ${item.nome ?? `Exercício ${item.exercicio_id}`}`}
          subtitulo={`${item.series} × ${item.repeticoes} · ${comUnidade(formatarNumero(item.carga), 'kg')} · descanso ${item.descanso}s`}
          thumbUri={item.imagem}
          icone="barbell-outline"
          separador={indice < itens.length - 1}
        />
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  dia: {
    color: cores.primaria,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  titulo: { color: cores.texto, fontFamily: fonteDisplay, fontSize: 28, lineHeight: 34, marginTop: 6 },
  estatisticas: { flexDirection: 'row', gap: 12, marginTop: 20 },
});
