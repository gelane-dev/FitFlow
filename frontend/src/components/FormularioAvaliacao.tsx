import { StyleSheet, View } from 'react-native';

import { CampoTexto } from '@/components/ui/CampoTexto';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { CamposAvaliacao } from '@/utils/avaliacaoForm';
import { mascararData } from '@/utils/datas';
import { Erros } from '@/utils/validacaoFormularios';

interface FormularioAvaliacaoProps {
  campos: CamposAvaliacao;
  onChange: (campo: keyof CamposAvaliacao, valor: string) => void;
  erros?: Erros<keyof CamposAvaliacao>;
}

/** Campos da avaliação física em seções; o botão de salvar fica no rodapé da tela. */
export function FormularioAvaliacao({ campos, onChange, erros = {} }: FormularioAvaliacaoProps) {
  return (
    <>
      <TituloSecao titulo="Data" />
      <CampoTexto
        icone="calendar-outline"
        placeholder="DD/MM/AAAA"
        value={campos.data}
        onChangeText={(v) => onChange('data', mascararData(v))}
        erro={erros.data}
        keyboardType="number-pad"
        maxLength={10}
      />

      <TituloSecao titulo="Medidas" />
      <View style={estilos.grade}>
        <View style={estilos.coluna}>
          <CampoTexto
            rotulo="Peso (kg)"
            placeholder="Ex.: 72,5"
            value={campos.peso}
            onChangeText={(v) => onChange('peso', v)}
            erro={erros.peso}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={estilos.coluna}>
          <CampoTexto
            rotulo="Altura (m)"
            placeholder="Ex.: 1,75"
            value={campos.altura}
            onChangeText={(v) => onChange('altura', v)}
            erro={erros.altura}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <TituloSecao titulo="Composição corporal (opcional)" />
      <View style={estilos.grade}>
        <View style={estilos.coluna}>
          <CampoTexto
            rotulo="Gordura (%)"
            placeholder="Ex.: 18"
            value={campos.percentualGordura}
            onChangeText={(v) => onChange('percentualGordura', v)}
            erro={erros.percentualGordura}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={estilos.coluna}>
          <CampoTexto
            rotulo="Massa muscular (kg)"
            placeholder="Ex.: 35"
            value={campos.massaMuscular}
            onChangeText={(v) => onChange('massaMuscular', v)}
            erro={erros.massaMuscular}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <TituloSecao titulo="Observação (opcional)" />
      <CampoTexto
        placeholder="Anotações"
        value={campos.observacao}
        onChangeText={(v) => onChange('observacao', v)}
        maxLength={500}
        multiline
      />
    </>
  );
}

const estilos = StyleSheet.create({
  grade: { flexDirection: 'row', gap: 12 },
  coluna: { flex: 1 },
});
