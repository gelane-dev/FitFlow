import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { PeriodoEvolucao } from '@/types/evolucao.types';
import { PERIODOS_EVOLUCAO } from '@/utils/progressoEvolucao';

export interface SeletorPeriodoProps {
  /** `null` = todo o histórico. */
  valor: PeriodoEvolucao | null;
  onChange: (periodo: PeriodoEvolucao | null) => void;
}

/**
 * Filtro de período (`7D 30D 3M 6M 1A Tudo`) numa linha só, com chips de largura igual: cabe em
 * 320 px sem rolar nem quebrar. Reutilizável em qualquer gráfico por período.
 */
export function SeletorPeriodo({ valor, onChange }: SeletorPeriodoProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Período" style={estilos.linha}>
      {PERIODOS_EVOLUCAO.map((periodo) => (
        <Chip
          key={periodo.valor ?? 'tudo'}
          rotulo={periodo.rotulo}
          selecionado={periodo.valor === valor}
          onPress={() => onChange(periodo.valor)}
          testID={`periodo-${periodo.valor ?? 'tudo'}`}
          igual
          papel="radio"
        />
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', gap: 4 },
});
