import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Pressionavel } from '@/components/ui/Pressionavel';
import { cores, raios } from '@/theme';

export type EstadoExercicio = 'feito' | 'atual' | 'pendente';

export interface LinhaExercicioTreino {
  id: number;
  nome: string;
  feitas: number;
  total: number;
  estado: EstadoExercicio;
}

type ListaExerciciosTreinoProps = {
  linhas: LinhaExercicioTreino[];
  onSelecionar: (indice: number) => void;
};

/** Lista dos exercícios do treino com o estado de cada um: feito, atual ou pendente. */
export function ListaExerciciosTreino({ linhas, onSelecionar }: ListaExerciciosTreinoProps) {
  return (
    <View>
      {linhas.map((linha, indice) => (
        <Pressionavel
          key={linha.id}
          onPress={() => onSelecionar(indice)}
          haptico="leve"
          accessibilityRole="button"
          accessibilityLabel={`${linha.nome}, ${linha.feitas} de ${linha.total} séries, ${linha.estado}`}
          testID={`exercicio-${indice}`}
          style={[estilos.linha, linha.estado === 'atual' && estilos.linhaAtual]}
        >
          <View
            style={[
              estilos.marca,
              linha.estado === 'feito' && estilos.marcaFeita,
              linha.estado === 'atual' && estilos.marcaAtual,
            ]}
          >
            {linha.estado === 'feito' ? (
              <Ionicons name="checkmark" size={16} color={cores.sobrePrimaria} />
            ) : (
              <Text style={[estilos.numero, linha.estado === 'atual' && estilos.numeroAtual]}>
                {indice + 1}
              </Text>
            )}
          </View>

          <Text
            style={[estilos.nome, linha.estado === 'pendente' && estilos.nomePendente]}
            numberOfLines={1}
          >
            {linha.nome}
          </Text>

          <Text style={estilos.contagem}>
            {linha.feitas}/{linha.total}
          </Text>
        </Pressionavel>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 56,
    paddingHorizontal: 12,
    borderRadius: raios.botao,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  linhaAtual: { backgroundColor: cores.superficie, borderColor: cores.primaria },
  marca: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: cores.superficieElevada,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcaFeita: { backgroundColor: cores.sucesso },
  marcaAtual: { backgroundColor: cores.primaria },
  numero: { color: cores.textoSecundario, fontSize: 13, fontWeight: '700' },
  numeroAtual: { color: cores.sobrePrimaria },
  nome: { flex: 1, color: cores.texto, fontSize: 15, fontWeight: '600' },
  nomePendente: { color: cores.textoSecundario },
  contagem: { color: cores.textoTerciario, fontSize: 13, fontWeight: '700' },
});
