import { TextStyle } from 'react-native';

/** Orbitron só para títulos grandes, números de estatística e a marca. */
export const fonteDisplay = 'OrbitronMedium';

export const tamanhos = {
  tituloTela: 34,
  titulo: 28,
  subtitulo: 22,
  corpoForte: 17,
  corpo: 15,
  legenda: 13,
  rotulo: 11,
} as const;

/**
 * Números (estatísticas, cronômetro, cargas, séries, gráficos): fonte do sistema em peso 800
 * com algarismos de largura fixa. O Orbitron fica só em títulos de tela e na marca, porque o
 * zero dele parece um ícone de "proibido" (QA I-01 / P-17).
 */
export const numero = {
  fontWeight: '800',
  fontVariant: ['tabular-nums'],
} satisfies TextStyle;

/** Estilos de texto prontos (a cor é definida por quem usa). */
export const tipografia = {
  numero,
  tituloTela: { fontFamily: fonteDisplay, fontSize: tamanhos.tituloTela, lineHeight: 40 },
  titulo: { fontFamily: fonteDisplay, fontSize: tamanhos.titulo, lineHeight: 34 },
  subtitulo: { fontSize: tamanhos.subtitulo, fontWeight: '700', lineHeight: 28 },
  corpoForte: { fontSize: tamanhos.corpoForte, fontWeight: '600', lineHeight: 22 },
  corpo: { fontSize: tamanhos.corpo, lineHeight: 21 },
  legenda: { fontSize: tamanhos.legenda, lineHeight: 18 },
  rotulo: {
    fontSize: tamanhos.rotulo,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;
