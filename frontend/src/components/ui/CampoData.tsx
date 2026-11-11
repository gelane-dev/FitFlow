import { dataBrParaIso, mascararData } from '@/utils/datas';

import { CampoTexto, CampoTextoProps } from './CampoTexto';

export interface CampoDataProps extends Omit<CampoTextoProps, 'value' | 'onChangeText' | 'keyboardType' | 'maxLength'> {
  /** Texto do campo no formato DD/MM/AAAA (mascarado enquanto digita). */
  value: string;
  /** Recebe o texto mascarado e a data ISO ("2026-11-09"), ou `null` se incompleta/inválida. */
  onChangeData: (texto: string, iso: string | null) => void;
}

/** Campo de data DD/MM/AAAA com máscara; o valor ISO só existe quando a data é válida. */
export function CampoData({ value, onChangeData, rotulo = 'Data', placeholder = 'DD/MM/AAAA', ...rest }: CampoDataProps) {
  return (
    <CampoTexto
      icone="calendar-outline"
      accessibilityLabel={rotulo}
      accessibilityHint="Digite dia, mês e ano, no formato DD/MM/AAAA"
      {...rest}
      rotulo={rotulo}
      placeholder={placeholder}
      keyboardType="number-pad"
      maxLength={10}
      value={value}
      onChangeText={(texto) => {
        const mascarado = mascararData(texto);

        onChangeData(mascarado, dataBrParaIso(mascarado));
      }}
    />
  );
}
