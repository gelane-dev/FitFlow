import { StyleSheet, View } from 'react-native';

import { CampoTexto } from '@/components/ui/CampoTexto';
import { mascararData } from '@/utils/datas';
import { Erros } from '@/utils/validacaoFormularios';

/** Datas em DD/MM/AAAA com máscara automática; converta com `dataBrParaIso` ao enviar. */
interface CamposVigenciaProps {
  dataInicio: string;
  dataFim: string;
  onChangeInicio: (valor: string) => void;
  onChangeFim: (valor: string) => void;
  erroInicio?: string;
  erroFim?: string;
}

/** Erros de vigência vindos de `validarFicha`. */
export function errosVigencia(erros: Erros<'dataInicio' | 'dataFim'>) {
  return { erroInicio: erros.dataInicio, erroFim: erros.dataFim };
}

export function CamposVigencia({
  dataInicio,
  dataFim,
  onChangeInicio,
  onChangeFim,
  erroInicio,
  erroFim,
}: CamposVigenciaProps) {
  return (
    <View style={estilos.linha}>
      <View style={estilos.coluna}>
        <CampoTexto
          rotulo="Início (opcional)"
          icone="calendar-outline"
          placeholder="DD/MM/AAAA (padrão: hoje)"
          value={dataInicio}
          onChangeText={(valor) => onChangeInicio(mascararData(valor))}
          erro={erroInicio}
          keyboardType="number-pad"
          maxLength={10}
        />
      </View>

      <View style={estilos.coluna}>
        <CampoTexto
          rotulo="Fim (opcional)"
          icone="flag-outline"
          placeholder="DD/MM/AAAA"
          value={dataFim}
          onChangeText={(valor) => onChangeFim(mascararData(valor))}
          erro={erroFim}
          keyboardType="number-pad"
          maxLength={10}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { gap: 0 },
  coluna: { flex: 1 },
});
