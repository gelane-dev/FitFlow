import { Ionicons } from '@expo/vector-icons';
import { Ref, useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { cores, raios } from '@/theme';

import { Pressionavel } from './Pressionavel';

export interface CampoTextoProps extends TextInputProps {
  /** Ref do TextInput (para encadear o foco entre campos). */
  ref?: Ref<TextInput>;
  rotulo?: string;
  erro?: string | null;
  /** Ícone Ionicons à esquerda do texto. */
  icone?: keyof typeof Ionicons.glyphMap;
}

/** Cor da borda do campo conforme o estado. */
export function corBordaCampo(focado: boolean, erro?: string | null): string {
  if (erro) {
    return cores.perigo;
  }

  return focado ? cores.primaria : cores.borda;
}

/** Campo de formulário: rótulo acima, fundo elevado e borda amarela no foco. */
export function CampoTexto({
  rotulo,
  erro,
  icone,
  style,
  onFocus,
  onBlur,
  secureTextEntry,
  multiline,
  ...rest
}: CampoTextoProps) {
  const [focado, setFocado] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);

  return (
    <View style={estilos.grupo}>
      {rotulo ? <Text style={estilos.rotulo}>{rotulo}</Text> : null}

      <View
        style={[
          estilos.caixa,
          multiline && estilos.caixaMultilinha,
          { borderColor: corBordaCampo(focado, erro) },
        ]}
      >
        {icone && (
          <Ionicons
            name={icone}
            size={18}
            color={focado ? cores.primaria : cores.textoTerciario}
            style={estilos.icone}
          />
        )}

        <TextInput
          placeholderTextColor={cores.textoPlaceholder}
          selectionColor={cores.primaria}
          cursorColor={cores.primaria}
          multiline={multiline}
          secureTextEntry={secureTextEntry && !senhaVisivel}
          {...rest}
          onFocus={(e) => {
            setFocado(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocado(false);
            onBlur?.(e);
          }}
          style={[estilos.entrada, multiline && estilos.entradaMultilinha, style]}
        />

        {secureTextEntry && (
          <Pressionavel
            onPress={() => setSenhaVisivel((v) => !v)}
            accessibilityLabel={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
            hitSlop={8}
          >
            <Ionicons
              name={senhaVisivel ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={cores.textoTerciario}
            />
          </Pressionavel>
        )}
      </View>

      {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { marginBottom: 18 },
  rotulo: { color: cores.textoSecundario, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  caixa: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    backgroundColor: cores.superficieElevada,
    borderWidth: 1,
    borderRadius: raios.input,
    paddingHorizontal: 14,
  },
  caixaMultilinha: { alignItems: 'flex-start', paddingVertical: 12 },
  icone: { marginRight: 10 },
  entrada: { flex: 1, color: cores.texto, fontSize: 15, paddingVertical: 0, height: 50 },
  entradaMultilinha: { height: undefined, minHeight: 88, textAlignVertical: 'top' },
  erro: { color: cores.perigo, fontSize: 12, marginTop: 6 },
});
