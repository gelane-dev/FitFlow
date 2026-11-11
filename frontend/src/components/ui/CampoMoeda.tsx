import { mascararMoeda, moedaParaDecimal } from '@/utils/campoMoeda';

import { CampoTexto, CampoTextoProps } from './CampoTexto';

export interface CampoMoedaProps extends Omit<CampoTextoProps, 'value' | 'onChangeText' | 'keyboardType'> {
  /** Texto mascarado do campo ("1.234,56"). Para preencher a partir da API use `decimalParaCampo`. */
  value: string;
  /** Recebe o texto mascarado e o decimal ("1234.56", ou `null` se vazio) para enviar à API. */
  onChangeValor: (texto: string, decimal: string | null) => void;
}

/** Campo de valor em reais: prefixo R$, máscara de centavos enquanto digita. */
export function CampoMoeda({ value, onChangeValor, rotulo = 'Valor', placeholder = '0,00', ...rest }: CampoMoedaProps) {
  return (
    <CampoTexto
      icone="cash-outline"
      {...rest}
      rotulo={rotulo}
      placeholder={placeholder}
      keyboardType="number-pad"
      value={value ? `R$ ${value}` : ''}
      onChangeText={(texto) => {
        const mascarado = mascararMoeda(texto);

        onChangeValor(mascarado, moedaParaDecimal(mascarado));
      }}
    />
  );
}
