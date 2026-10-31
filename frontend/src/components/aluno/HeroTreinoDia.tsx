import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { HeroGradiente } from '@/components/ui/HeroGradiente';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { cores, fonteDisplay, raios } from '@/theme';
import { SessaoResumo } from '@/types/sessao.types';
import { formatarDuracao, segundosParaMinutos } from '@/utils/historicoAluno';
import { formatarVolume } from '@/utils/painelAluno';
import { comUnidade, descreverTreino } from '@/utils/pluralizacao';

export type EstadoHeroTreino = 'novo' | 'andamento' | 'concluido';

type HeroTreinoDiaProps = {
  nome: string;
  exercicios: number;
  duracaoEstimadaMin: number;
  /** Há sessão aberta deste treino: o botão vira "Continuar treino". */
  emAndamento: boolean;
  /** Sessão finalizada hoje: o hero mostra o resumo e "Treinar de novo". */
  concluida?: SessaoResumo;
  onComecar: () => void;
  onContinuar: () => void;
  onTreinarDeNovo: () => void;
};

/** Estado do hero: sessão aberta tem prioridade; depois a concluída hoje; senão, treino novo. */
export function estadoDoHero(emAndamento: boolean, concluida?: SessaoResumo): EstadoHeroTreino {
  if (emAndamento) {
    return 'andamento';
  }

  return concluida ? 'concluido' : 'novo';
}

/** Rótulo do hero: sessão aberta tem prioridade sobre o treino de hoje. */
export function rotuloHero(estado: EstadoHeroTreino): string {
  if (estado === 'andamento') {
    return 'Treino em andamento';
  }

  return estado === 'concluido' ? 'Treino de hoje concluído ✓' : 'Treino de hoje';
}

/** Hero do Início: treino de hoje (começar/continuar) ou, já feito, "Treino de hoje concluído ✓". */
export function HeroTreinoDia({
  nome,
  exercicios,
  duracaoEstimadaMin,
  emAndamento,
  concluida,
  onComecar,
  onContinuar,
  onTreinarDeNovo,
}: HeroTreinoDiaProps) {
  const estado = estadoDoHero(emAndamento, concluida);
  const concluido = estado === 'concluido';

  return (
    <HeroGradiente testID="hero-treino-hoje">
      <Text style={estilos.rotulo}>{rotuloHero(estado)}</Text>
      <Text style={estilos.titulo} numberOfLines={2}>
        {nome}
      </Text>

      {concluido && concluida ? (
        <View style={estilos.meta} testID="hero-resumo-concluido">
          <View style={estilos.item}>
            <Ionicons name="time-outline" size={16} color={cores.sobrePrimaria} />
            <Text style={estilos.texto}>
              {formatarDuracao(segundosParaMinutos(concluida.duracao_segundos))}
            </Text>
          </View>
          <View style={estilos.item}>
            <Ionicons name="barbell-outline" size={16} color={cores.sobrePrimaria} />
            <Text style={estilos.texto}>{comUnidade(formatarVolume(concluida.volume_total), 'kg')}</Text>
          </View>
        </View>
      ) : (
        <View style={estilos.meta}>
          <View style={estilos.item}>
            <Ionicons name="barbell-outline" size={16} color={cores.sobrePrimaria} />
            <Text style={estilos.texto}>{descreverTreino(exercicios, duracaoEstimadaMin)}</Text>
          </View>
        </View>
      )}

      {concluido ? (
        <Pressionavel
          onPress={onTreinarDeNovo}
          haptico="leve"
          accessibilityRole="button"
          testID="botao-treinar-de-novo"
          style={[estilos.botao, estilos.botaoSecundario]}
        >
          <Ionicons name="refresh" size={18} color={cores.sobrePrimaria} />
          <Text style={[estilos.botaoTexto, estilos.botaoTextoSecundario]}>Treinar de novo</Text>
        </Pressionavel>
      ) : (
        <Pressionavel
          onPress={estado === 'andamento' ? onContinuar : onComecar}
          haptico="media"
          accessibilityRole="button"
          testID="botao-comecar-treino"
          style={estilos.botao}
        >
          <Ionicons name="play" size={18} color={cores.primaria} />
          <Text style={estilos.botaoTexto}>
            {estado === 'andamento' ? 'Continuar treino' : 'Começar treino'}
          </Text>
        </Pressionavel>
      )}
    </HeroGradiente>
  );
}

const estilos = StyleSheet.create({
  rotulo: {
    color: cores.sobrePrimaria,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    opacity: 0.75,
  },
  titulo: {
    color: cores.sobrePrimaria,
    fontFamily: fonteDisplay,
    fontSize: 28,
    lineHeight: 34,
    marginTop: 8,
  },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 14, marginBottom: 22 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  texto: { color: cores.sobrePrimaria, fontSize: 14, fontWeight: '600' },
  botao: {
    height: 52,
    borderRadius: raios.botao,
    backgroundColor: cores.sobrePrimaria,
    borderWidth: 1,
    borderColor: cores.sobrePrimaria,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  botaoSecundario: { backgroundColor: 'transparent' },
  botaoTexto: { color: cores.primaria, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  botaoTextoSecundario: { color: cores.sobrePrimaria },
});
