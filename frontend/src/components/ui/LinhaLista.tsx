import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { cores, raios } from '@/theme';

import { Pressionavel } from './Pressionavel';

export interface LinhaListaProps {
  titulo: string;
  subtitulo?: string;
  /** Ícone Ionicons dentro de um quadrado à esquerda. */
  icone?: keyof typeof Ionicons.glyphMap;
  /** Miniatura (tem prioridade sobre o ícone). */
  thumbUri?: string | null;
  /** Conteúdo extra à direita (selo, valor...). */
  direita?: ReactNode;
  onPress?: () => void;
  /** Sem chevron à direita (padrão: chevron aparece se houver onPress). */
  semChevron?: boolean;
  /** Linha fina embaixo (padrão: sim). */
  separador?: boolean;
  testID?: string;
}

/** Linha de lista de 64–72 px: ícone/thumb, título, subtítulo e chevron. */
export function LinhaLista({
  titulo,
  subtitulo,
  icone,
  thumbUri,
  direita,
  onPress,
  semChevron,
  separador = true,
  testID,
}: LinhaListaProps) {
  const conteudo = (
    <>
      {thumbUri ? (
        <Image source={{ uri: thumbUri }} style={estilos.lado} contentFit="cover" />
      ) : icone ? (
        <View style={[estilos.lado, estilos.ladoIcone]}>
          <Ionicons name={icone} size={20} color={cores.primaria} />
        </View>
      ) : null}

      <View style={estilos.textos}>
        <Text style={estilos.titulo} numberOfLines={2}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text style={estilos.subtitulo} numberOfLines={2}>
            {subtitulo}
          </Text>
        ) : null}
      </View>

      {direita}

      {onPress && !semChevron && (
        <Ionicons name="chevron-forward" size={18} color={cores.textoTerciario} />
      )}
    </>
  );

  const estiloLinha = [estilos.linha, separador && estilos.separador];

  if (!onPress) {
    return (
      <View style={estiloLinha} testID={testID}>
        {conteudo}
      </View>
    );
  }

  return (
    <Pressionavel
      onPress={onPress}
      style={estiloLinha}
      escala={0.99}
      testID={testID}
      accessibilityRole="button"
    >
      {conteudo}
    </Pressionavel>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', minHeight: 68, paddingVertical: 10, gap: 12 },
  separador: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: cores.borda },
  lado: { width: 44, height: 44, borderRadius: raios.chip, backgroundColor: cores.superficieElevada },
  ladoIcone: { alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1 },
  titulo: { color: cores.texto, fontSize: 16, fontWeight: '600' },
  subtitulo: { color: cores.textoSecundario, fontSize: 13, marginTop: 2 },
});
