import { StyleSheet, Text, View } from 'react-native';

import { cores, tamanhos, tipografia } from '@/theme';

export interface BlocoEstatisticaProps {
  valor: string | number;
  rotulo: string;
  unidade?: string;
  /** Destaca o número em amarelo. */
  destaque?: boolean;
  /** Texto completo para leitores de tela quando `valor` é abreviado (ex.: "18.600" para "18,6 mil"). */
  valorCompleto?: string;
}

/**
 * Tamanho do número conforme o comprimento (valor + metade da unidade): `adjustsFontSizeToFit` não
 * funciona na web, e três colunas a 390 px têm ~100 px cada. O valor nunca termina em reticências (QA-GA-08).
 */
export function tamanhoFonteEstatistica(valor: string | number, unidade?: string): number {
  const peso = String(valor).length + (unidade ? unidade.length * 0.5 + 0.5 : 0);

  if (peso <= 4) return tamanhos.titulo;
  if (peso <= 6) return tamanhos.subtitulo + 2;
  if (peso <= 8) return tamanhos.subtitulo - 2;
  if (peso <= 10) return tamanhos.corpoForte;

  return tamanhos.corpo - 1;
}

/** Número grande (fonte do sistema, algarismos tabulares) com rótulo pequeno embaixo (estilo Strava). */
export function BlocoEstatistica({ valor, rotulo, unidade, destaque, valorCompleto }: BlocoEstatisticaProps) {
  const tamanho = tamanhoFonteEstatistica(valor, unidade);

  return (
    <View
      style={estilos.bloco}
      accessible
      accessibilityLabel={`${rotulo}: ${valorCompleto ?? valor}${unidade ? ` ${unidade}` : ''}`}
    >
      <Text
        style={[estilos.valor, { fontSize: tamanho, lineHeight: tamanho + 6 }, destaque && { color: cores.primaria }]}
        adjustsFontSizeToFit
      >
        {valor}
        {unidade ? <Text style={estilos.unidade}> {unidade}</Text> : null}
      </Text>
      <Text style={estilos.rotulo}>
        {rotulo}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { flex: 1 },
  valor: { ...tipografia.numero, color: cores.texto, fontSize: 28, lineHeight: 34 },
  unidade: { fontSize: 13, fontWeight: '600', color: cores.textoSecundario },
  rotulo: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
