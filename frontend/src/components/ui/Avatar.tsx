import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { cores, fonteDisplay } from '@/theme';

export interface AvatarProps {
  uri?: string | null;
  nome?: string | null;
  tamanho?: number;
}

const PARTICULAS = ['da', 'de', 'do', 'das', 'dos', 'e'];

/** Até duas iniciais do nome ("Maria da Silva" -> "MS"; sem nome -> "?"). */
export function iniciais(nome?: string | null): string {
  const partes = (nome ?? '')
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0 && !PARTICULAS.includes(p.toLowerCase()));

  if (partes.length === 0) {
    return '?';
  }

  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';

  return (primeira + ultima).toUpperCase();
}

/** Foto redonda do usuário; sem foto mostra as iniciais sobre fundo elevado. */
export function Avatar({ uri, nome, tamanho = 44 }: AvatarProps) {
  const base = { width: tamanho, height: tamanho, borderRadius: tamanho / 2 };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[base, estilos.foto]}
        accessibilityLabel={nome ?? 'Foto de perfil'}
      />
    );
  }

  return (
    <View style={[base, estilos.iniciais]}>
      <Text style={[estilos.texto, { fontSize: Math.max(11, tamanho * 0.36) }]}>
        {iniciais(nome)}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  foto: { backgroundColor: cores.superficieElevada },
  iniciais: {
    backgroundColor: cores.superficieElevada,
    borderWidth: 1,
    borderColor: cores.bordaForte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { color: cores.primaria, fontFamily: fonteDisplay },
});
