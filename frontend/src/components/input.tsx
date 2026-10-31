import { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';

import { corBordaCampo } from '@/components/ui/CampoTexto';
import { cores, raios } from '@/theme';

/**
 * Compatibilidade: campo simples (sem rótulo) usado pelas telas ainda não
 * redesenhadas. Novo código deve usar `CampoTexto` de `@/components/ui` (ADR-031).
 */
export function Input({ style, onFocus, onBlur, ...rest }: TextInputProps) {
  const [focado, setFocado] = useState(false);

  return (
    <TextInput
      placeholderTextColor={cores.textoTerciario}
      selectionColor={cores.primaria}
      cursorColor={cores.primaria}
      {...rest}
      onFocus={(e) => {
        setFocado(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocado(false);
        onBlur?.(e);
      }}
      style={[styles.input, { borderColor: corBordaCampo(focado) }, style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    width: '100%',
    height: 52,
    backgroundColor: cores.superficieElevada,
    borderWidth: 1,
    borderRadius: raios.input,
    paddingHorizontal: 15,
    color: cores.texto,
    fontSize: 15,
    marginBottom: 22,
  },
});
