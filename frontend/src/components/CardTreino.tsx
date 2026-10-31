import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { cores, raios } from '@/theme';
import { Treino } from '@/types/ficha.types';
import { rotuloDiaCompleto } from '@/utils/diasSemana';

interface CardTreinoProps {
  treino: Treino;
  onPress: () => void;
  onRemover?: () => void;
  onEditar?: () => void;
}

/** "terça" -> "Terça". */
export const rotuloDia = rotuloDiaCompleto;

/** "1 exercício" / "3 exercícios" / "0 exercícios". */
export function rotuloExercicios(total: number): string {
  return `${total} exercício${total === 1 ? '' : 's'}`;
}

/** Card de treino de uma ficha: chip do dia da semana, nome e ordem. */
export function CardTreino({ treino, onPress, onRemover, onEditar }: CardTreinoProps) {
  return (
    <View style={estilos.card}>
      <Pressionavel
        onPress={onPress}
        escala={0.99}
        style={estilos.principal}
        accessibilityRole="button"
        accessibilityLabel={`Abrir treino ${treino.nome}`}
      >
        <View style={estilos.chip}>
          <Chip rotulo={rotuloDia(treino.dia_semana)} selecionado />
        </View>

        <Text style={estilos.nome} numberOfLines={2}>
          {treino.nome}
        </Text>

        <Text style={estilos.ordem}>
          Treino {treino.ordem} · {rotuloExercicios(treino.total_itens)}
        </Text>
      </Pressionavel>

      <View style={estilos.acoes}>
        {onEditar ? (
          <Pressionavel
            onPress={onEditar}
            hitSlop={8}
            style={estilos.acao}
            accessibilityRole="button"
            accessibilityLabel={`Editar treino ${treino.nome}`}
          >
            <Ionicons name="create-outline" size={20} color={cores.textoSecundario} />
          </Pressionavel>
        ) : null}

        {onRemover ? (
          <Pressionavel
            onPress={onRemover}
            hitSlop={8}
            style={estilos.acao}
            accessibilityRole="button"
            accessibilityLabel={`Excluir treino ${treino.nome}`}
          >
            <Ionicons name="trash-outline" size={20} color={cores.textoTerciario} />
          </Pressionavel>
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.cartao,
    marginBottom: 12,
  },
  principal: { flex: 1, padding: 16, gap: 6 },
  chip: { flexDirection: 'row', marginBottom: 4 },
  nome: { color: cores.texto, fontSize: 17, fontWeight: '700' },
  ordem: { color: cores.textoSecundario, fontSize: 13 },
  acoes: {
    alignSelf: 'stretch',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: cores.borda,
  },
  acao: { flex: 1, width: 48, alignItems: 'center', justifyContent: 'center' },
});
