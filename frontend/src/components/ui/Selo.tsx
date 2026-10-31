import { StyleSheet, Text, View } from 'react-native';

import { cores, raios } from '@/theme';

export type TomSelo = 'primario' | 'sucesso' | 'perigo' | 'aviso' | 'neutro';

export interface SeloProps {
  rotulo: string;
  tom?: TomSelo;
}

const TONS: Record<TomSelo, string> = {
  primario: cores.primaria,
  sucesso: cores.sucesso,
  perigo: cores.perigo,
  aviso: cores.aviso,
  neutro: cores.textoSecundario,
};

/** Etiqueta de status (ex.: VIGENTE, FINALIZADO). */
export function Selo({ rotulo, tom = 'primario' }: SeloProps) {
  const cor = TONS[tom];

  return (
    <View style={[estilos.selo, { borderColor: cor }]}>
      <Text style={[estilos.texto, { color: cor }]}>{rotulo}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  selo: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: raios.chip,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  texto: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
});
