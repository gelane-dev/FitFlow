import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { MiniaturaExercicio } from '@/components/exercicios/MiniaturaExercicio';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { cores, raios, tipografia } from '@/theme';
import { ItemFicha } from '@/types/ficha.types';

interface CardItemTreinoProps {
  item: ItemFicha;
  onRemover: (id: number, nome: string) => void;
  onEditar?: () => void;
  onSubir?: () => void;
  onDescer?: () => void;
  desabilitado?: boolean;
}

function Pilula({ valor, rotulo }: { valor: string | number; rotulo: string }) {
  return (
    <View style={estilos.pilula}>
      <Text style={estilos.valorPilula}>{valor}</Text>
      <Text style={estilos.rotuloPilula}>{rotulo}</Text>
    </View>
  );
}

/** Item numerado do treino: miniatura, nome, pílulas de carga e controles de ordem. */
export function CardItemTreino({
  item,
  onRemover,
  onEditar,
  onSubir,
  onDescer,
  desabilitado = false,
}: CardItemTreinoProps) {
  const temOrdem = Boolean(onSubir || onDescer);

  return (
    <View style={estilos.card}>
      <View style={estilos.linha}>
        <View style={estilos.numero}>
          <Text style={estilos.textoNumero}>{item.ordem}</Text>
        </View>

        <MiniaturaExercicio uri={item.imagem} tamanho={52} />

        <View style={estilos.info}>
          <Text style={estilos.nome} numberOfLines={2}>
            {item.nome}
          </Text>
          <Text style={estilos.grupo} numberOfLines={1}>
            {item.grupo_muscular}
          </Text>
        </View>

        {temOrdem ? (
          <View style={estilos.ordem} accessibilityLabel="Reordenar">
            {onSubir ? (
              <Pressionavel
                onPress={onSubir}
                disabled={desabilitado}
                haptico="leve"
                hitSlop={6}
                style={estilos.seta}
                accessibilityRole="button"
                accessibilityLabel={`Subir ${item.nome}`}
              >
                <Text style={estilos.textoSeta}>↑</Text>
              </Pressionavel>
            ) : null}
            {onDescer ? (
              <Pressionavel
                onPress={onDescer}
                disabled={desabilitado}
                haptico="leve"
                hitSlop={6}
                style={estilos.seta}
                accessibilityRole="button"
                accessibilityLabel={`Descer ${item.nome}`}
              >
                <Text style={estilos.textoSeta}>↓</Text>
              </Pressionavel>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={estilos.pilulas}>
        <Pilula valor={item.series} rotulo="séries" />
        <Pilula valor={item.repeticoes} rotulo="reps" />
        <Pilula valor={`${item.carga} kg`} rotulo="carga" />
        <Pilula valor={`${item.descanso} s`} rotulo="descanso" />
      </View>

      <View style={estilos.acoes}>
        {onEditar ? (
          <Pressionavel
            onPress={onEditar}
            disabled={desabilitado}
            style={estilos.acao}
            accessibilityRole="button"
            accessibilityLabel={`Editar ${item.nome}`}
          >
            <Ionicons name="create-outline" size={16} color={cores.textoSecundario} />
            <Text style={estilos.textoAcao}>Editar</Text>
          </Pressionavel>
        ) : null}

        <Pressionavel
          onPress={() => onRemover(item.id, item.nome)}
          disabled={desabilitado}
          style={estilos.acao}
          accessibilityRole="button"
          accessibilityLabel={`Remover ${item.nome}`}
        >
          <Ionicons name="trash-outline" size={16} color={cores.perigo} />
          <Text style={[estilos.textoAcao, { color: cores.perigo }]}>Remover</Text>
        </Pressionavel>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  card: {
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.cartao,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numero: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoNumero: { color: cores.sobrePrimaria, ...tipografia.numero, fontSize: 14 },
  info: { flex: 1 },
  nome: { color: cores.texto, fontSize: 16, fontWeight: '700' },
  grupo: { color: cores.primaria, fontSize: 13, fontWeight: '600', marginTop: 2 },
  ordem: {
    gap: 6,
    padding: 4,
    borderRadius: raios.botao,
    backgroundColor: cores.superficieElevada,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  seta: {
    width: 34,
    height: 30,
    borderRadius: raios.chip,
    backgroundColor: cores.bordaForte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoSeta: { color: cores.primaria, fontSize: 18, fontWeight: '700', lineHeight: 22 },
  pilulas: { flexDirection: 'row', gap: 8 },
  pilula: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: raios.chip,
    backgroundColor: cores.superficieElevada,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  valorPilula: { color: cores.texto, fontSize: 15, fontWeight: '700' },
  rotuloPilula: { color: cores.textoTerciario, fontSize: 11, marginTop: 2 },
  acoes: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cores.borda,
    paddingTop: 10,
  },
  acao: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  textoAcao: { color: cores.textoSecundario, fontSize: 13, fontWeight: '600' },
});
