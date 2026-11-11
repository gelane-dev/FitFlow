import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { MiniaturaExercicio } from '@/components/exercicios/MiniaturaExercicio';
import { Etiqueta } from '@/components/ui/Etiqueta';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { cores, raios } from '@/theme';
import { Exercicio } from '@/types/exercicio.types';

interface CardExercicioProps {
  exercicio: Exercicio;
  onPress: () => void;
  onEditar?: () => void;
  /** Exercício de outro professor: sem o botão de editar. */
  podeEditar?: boolean;
  /** Origem exibida (ex.: "Biblioteca", "Meu exercício"). */
  origem?: string;
}

/** Card de exercício da biblioteca: miniatura, nome, grupo muscular e descrição. */
export function CardExercicio({ exercicio, onPress, onEditar, podeEditar = true, origem }: CardExercicioProps) {
  return (
    <View style={estilos.card}>
      <Pressionavel
        onPress={onPress}
        escala={0.99}
        style={estilos.principal}
        accessibilityRole="button"
        accessibilityLabel={`Abrir ${exercicio.nome}`}
      >
        <MiniaturaExercicio uri={exercicio.imagem} tamanho={72} />

        <View style={estilos.textos}>
          <Text style={estilos.nome} numberOfLines={2}>
            {exercicio.nome}
          </Text>

          <View style={estilos.chip}>
            <Etiqueta rotulo={exercicio.grupo_muscular} icone="body-outline" />
            {origem ? <Text style={estilos.origem}>{origem}</Text> : null}
          </View>

          <Text style={estilos.descricao} numberOfLines={2}>
            {exercicio.descricao}
          </Text>
        </View>
      </Pressionavel>

      {podeEditar && onEditar ? (
      <Pressionavel
        onPress={onEditar}
        haptico="leve"
        hitSlop={8}
        style={estilos.editar}
        accessibilityRole="button"
        accessibilityLabel={`Editar ${exercicio.nome}`}
      >
        <Ionicons name="create-outline" size={20} color={cores.textoSecundario} />
      </Pressionavel>
      ) : null}
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
  principal: { flex: 1, flexDirection: 'row', gap: 14, padding: 12 },
  textos: { flex: 1, gap: 6 },
  nome: { color: cores.texto, fontSize: 16, fontWeight: '700' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  origem: { color: cores.textoTerciario, fontSize: 12 },
  descricao: { color: cores.textoSecundario, fontSize: 13, lineHeight: 18 },
  editar: {
    width: 44,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: cores.borda,
  },
});
