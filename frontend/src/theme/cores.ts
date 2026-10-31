/** Paleta do FitFlow (Team Fitness): preto + amarelo/dourado. Ver docs/Design-System.md. */
export const cores = {
  fundo: '#0A0A0B',
  superficie: '#141416',
  superficieElevada: '#1C1C1F',
  borda: '#26262A',
  bordaForte: '#34343A',
  primaria: '#FECF2B',
  primariaPressionada: '#E6B800',
  sobrePrimaria: '#0A0A0B',
  texto: '#FFFFFF',
  textoSecundario: '#A1A1AA',
  /** Contraste ≥ 4,5:1 sobre fundo, superficie e superficieElevada (AA). */
  textoTerciario: '#8A8A93',
  /** Dica de campo vazio (placeholder): mais apagada que o texto digitado, só uma sugestão. */
  textoPlaceholder: '#5C5C65',
  sucesso: '#3DDC84',
  perigo: '#FF5A5F',
  aviso: '#FFB020',
  gradienteDestaque: ['#FECF2B', '#F5A623'] as const,
  /** Véu escuro usado sobre imagens de fundo. */
  veu: 'rgba(10, 10, 11, 0.72)',
  /** Fundo translúcido da barra de abas. */
  fundoTranslucido: 'rgba(10, 10, 11, 0.96)',
} as const;

export type NomeCor = Exclude<keyof typeof cores, 'gradienteDestaque'>;
