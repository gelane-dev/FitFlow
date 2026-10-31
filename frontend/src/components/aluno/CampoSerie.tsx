import { Ionicons } from '@expo/vector-icons';
import { KeyboardTypeOptions, StyleSheet, Text, TextInput, View } from 'react-native';

import { Pressionavel } from '@/components/ui/Pressionavel';
import { cores, raios, tipografia } from '@/theme';

/** Botão de 36 pt + 4 de cada lado = 44 pt de área de toque (revisão S-3). */
const HIT_SLOP_PASSO = { left: 4, right: 4 };

type CampoSerieProps = {
  rotulo: string;
  valor: string;
  onChange: (texto: string) => void;
  /** Passo dos botões − e +. */
  onMenos: () => void;
  onMais: () => void;
  editavel: boolean;
  teclado: KeyboardTypeOptions;
  testID?: string;
};

/** Campo grande de repetições/carga da série atual, com botões − e + para usar de luva. */
export function CampoSerie({
  rotulo,
  valor,
  onChange,
  onMenos,
  onMais,
  editavel,
  teclado,
  testID,
}: CampoSerieProps) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <View style={[estilos.caixa, !editavel && estilos.caixaFeita]}>
        <Pressionavel
          onPress={onMenos}
          disabled={!editavel}
          haptico="leve"
          accessibilityRole="button"
          accessibilityLabel={`Diminuir ${rotulo}`}
          hitSlop={HIT_SLOP_PASSO}
          style={estilos.passo}
        >
          <Ionicons name="remove" size={22} color={cores.texto} />
        </Pressionavel>

        <TextInput
          style={estilos.input}
          value={valor}
          onChangeText={onChange}
          keyboardType={teclado}
          editable={editavel}
          selectTextOnFocus
          testID={testID}
          accessibilityLabel={rotulo}
        />

        <Pressionavel
          onPress={onMais}
          disabled={!editavel}
          haptico="leve"
          accessibilityRole="button"
          accessibilityLabel={`Aumentar ${rotulo}`}
          hitSlop={HIT_SLOP_PASSO}
          style={estilos.passo}
        >
          <Ionicons name="add" size={22} color={cores.texto} />
        </Pressionavel>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  campo: { flex: 1 },
  rotulo: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
  },
  caixa: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cores.superficieElevada,
    borderRadius: raios.cartao,
    borderWidth: 1,
    borderColor: cores.bordaForte,
    height: 84,
    paddingHorizontal: 6,
  },
  caixaFeita: { opacity: 0.5 },
  passo: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: raios.chip,
  },
  input: {
    flex: 1,
    minWidth: 0,
    ...tipografia.numero,
    color: cores.primaria,
    fontSize: 34,
    textAlign: 'center',
    padding: 0,
  },
});
