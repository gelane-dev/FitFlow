import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { SeloVigente } from '@/components/SeloVigente';
import { Avatar } from '@/components/ui/Avatar';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { cores, raios } from '@/theme';
import { FichaLista } from '@/types/ficha.types';
import { descreverVigencia } from '@/utils/vigencia';

interface CardFichaProps {
  ficha: FichaLista;
  onPress: () => void;
  onRemover?: () => void;
  mostrarAluno?: boolean;
}

/** "1 treino" / "3 treinos" / "0 treinos". */
export function rotuloTreinos(total: number): string {
  return `${total} treino${total === 1 ? '' : 's'}`;
}

/** Card de ficha: nome, selo de vigência, aluno (com avatar) e período. */
export function CardFicha({ ficha, onPress, onRemover, mostrarAluno = true }: CardFichaProps) {
  const vigencia = descreverVigencia(ficha.data_inicio, ficha.data_fim);

  return (
    <View style={estilos.card}>
      <Pressionavel
        onPress={onPress}
        escala={0.99}
        style={estilos.principal}
        accessibilityRole="button"
        accessibilityLabel={`Abrir ficha ${ficha.nome}`}
      >
        <View style={estilos.topo}>
          <Text style={estilos.nome} numberOfLines={2}>
            {ficha.nome}
          </Text>
          {ficha.vigente ? <SeloVigente /> : null}
        </View>

        {mostrarAluno ? (
          <View style={estilos.aluno}>
            <Avatar nome={ficha.aluno_nome} tamanho={24} />
            <Text style={estilos.nomeAluno} numberOfLines={1}>
              {ficha.aluno_nome}
            </Text>
          </View>
        ) : null}

        {vigencia !== '' ? (
          <View style={estilos.vigencia}>
            <Ionicons name="calendar-outline" size={14} color={cores.textoTerciario} />
            <Text style={estilos.textoVigencia}>{vigencia}</Text>
          </View>
        ) : null}

        <View style={estilos.vigencia}>
          <Ionicons name="layers-outline" size={14} color={cores.textoTerciario} />
          <Text style={estilos.textoVigencia}>{rotuloTreinos(ficha.total_treinos)}</Text>
        </View>
      </Pressionavel>

      {onRemover ? (
        <Pressionavel
          onPress={onRemover}
          hitSlop={8}
          style={estilos.remover}
          accessibilityRole="button"
          accessibilityLabel={`Excluir ficha ${ficha.nome}`}
        >
          <Ionicons name="trash-outline" size={20} color={cores.textoTerciario} />
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
  principal: { flex: 1, padding: 16, gap: 10 },
  topo: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  nome: { flex: 1, color: cores.texto, fontSize: 17, fontWeight: '700' },
  aluno: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nomeAluno: { flex: 1, color: cores.primaria, fontSize: 13, fontWeight: '600' },
  vigencia: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  textoVigencia: { color: cores.textoSecundario, fontSize: 13 },
  remover: {
    width: 48,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: cores.borda,
  },
});
