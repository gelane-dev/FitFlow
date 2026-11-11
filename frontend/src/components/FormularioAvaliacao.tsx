import { StyleSheet, View } from 'react-native';

import { CampoTexto } from '@/components/ui/CampoTexto';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { CamposAvaliacao, ChaveErroAvaliacao } from '@/utils/avaliacaoForm';
import { ChaveMedida, MEDIDAS_CORPORAIS } from '@/utils/professorWeb';
import { mascararData } from '@/utils/datas';
import { Erros } from '@/utils/validacaoFormularios';

interface FormularioAvaliacaoProps {
  campos: CamposAvaliacao;
  onChange: (campo: Exclude<keyof CamposAvaliacao, 'medidas'>, valor: string) => void;
  /** Altera uma circunferência (cm). */
  onChangeMedida: (medida: ChaveMedida, valor: string) => void;
  erros?: Erros<ChaveErroAvaliacao>;
}

/** Campos da avaliação física em seções; o botão de salvar fica no rodapé da tela. */
export function FormularioAvaliacao({ campos, onChange, onChangeMedida, erros = {} }: FormularioAvaliacaoProps) {
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

      <TituloSecao titulo="Circunferências em cm (opcional)" />
      <View style={estilos.grade}>
        {MEDIDAS_CORPORAIS.map(({ chave, rotulo }) => (
          <View key={chave} style={estilos.medida}>
            <CampoTexto
              rotulo={`${rotulo} (cm)`}
              placeholder="Ex.: 82"
              value={campos.medidas[chave]}
              onChangeText={(v) => onChangeMedida(chave, v)}
              erro={erros[chave]}
              keyboardType="decimal-pad"
              accessibilityLabel={`${rotulo} em centímetros`}
              testID={`avaliacao-medida-${chave}`}
            />
          </View>
        ))}
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
  grade: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12 },
  medida: { flexBasis: '45%', flexGrow: 1, minWidth: 140 },
  coluna: { flex: 1 },
});
