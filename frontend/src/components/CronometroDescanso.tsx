import { StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/ui/Botao';
import { cores, margemTela, raios, tipografia } from '@/theme';
import { formatarTempo } from '@/utils/cronometro';

type CronometroDescansoProps = {
  restante: number;
  pausado: boolean;
  /** Duração total do descanso (s), para a barra de progresso; sem ela não há barra. */
  total?: number;
  onPausar: () => void;
  onRetomar: () => void;
  onAdicionar: () => void;
  onPular: () => void;
};

/** Folha de descanso: número enorme (fonte do sistema, tabular), barra de progresso, +15 s, pausar e pular. */
export function CronometroDescanso({
  restante,
  pausado,
  total,
  onPausar,
  onRetomar,
  onAdicionar,
  onPular,
}: CronometroDescansoProps) {
  const referencia = Math.max(total ?? 0, restante);
  const progresso = referencia > 0 ? 1 - restante / referencia : 1;

  return (
    <View style={estilos.fundo} testID="cronometro-descanso">
      <View style={estilos.folha}>
        <Text style={estilos.rotulo}>DESCANSO</Text>
        <Text style={estilos.tempo} accessibilityLabel={`${restante} segundos restantes`}>
          {formatarTempo(restante)}
        </Text>

        {total ? (
          <View style={estilos.trilho}>
            <View style={[estilos.preenchimento, { width: `${Math.round(progresso * 100)}%` }]} />
          </View>
        ) : null}

        <View style={estilos.acoes}>
          <View style={estilos.acao}>
            <Botao variante="secundario" tamanho="medio" onPress={onAdicionar}>
              +15 s
            </Botao>
          </View>
          <View style={estilos.acao}>
            <Botao variante="secundario" tamanho="medio" onPress={pausado ? onRetomar : onPausar}>
              {pausado ? 'Retomar' : 'Pausar'}
            </Botao>
          </View>
        </View>

        <Botao variante="primario" tamanho="grande" onPress={onPular}>
          Pular descanso
        </Botao>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  fundo: {
    ...StyleSheet.absoluteFill,
    backgroundColor: cores.veu,
    justifyContent: 'flex-end',
  },
  folha: {
    backgroundColor: cores.superficie,
    borderTopLeftRadius: raios.hero,
    borderTopRightRadius: raios.hero,
    borderTopWidth: 1,
    borderColor: cores.bordaForte,
    paddingHorizontal: margemTela,
    paddingTop: 28,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 16,
  },
  rotulo: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  tempo: { ...tipografia.numero, color: cores.primaria, fontSize: 96, lineHeight: 104 },
  trilho: {
    width: '100%',
    height: 6,
    borderRadius: raios.pilula,
    backgroundColor: cores.superficieElevada,
    overflow: 'hidden',
  },
  preenchimento: { height: 6, borderRadius: raios.pilula, backgroundColor: cores.primaria },
  acoes: { flexDirection: 'row', gap: 12, width: '100%' },
  acao: { flex: 1 },
});
