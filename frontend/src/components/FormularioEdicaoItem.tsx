import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { MiniaturaExercicio } from '@/components/exercicios/MiniaturaExercicio';
import { Botao } from '@/components/ui/Botao';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { cores, raios } from '@/theme';
import { useErrosAposTentativa } from '@/hooks/useErrosAposTentativa';
import { ItemFicha, ItemFichaAtualizar } from '@/types/ficha.types';
import { CampoItem, lerCarga, validarItem } from '@/utils/validacaoFormularios';
import { lerNumero } from '@/utils/vigencia';

interface FormularioEdicaoItemProps {
  item: ItemFicha;
  salvando: boolean;
  onSalvar: (dados: ItemFichaAtualizar) => void;
  onCancelar: () => void;
}

/** Edição inline de um item do treino (séries, reps, carga, descanso e ordem). */
export function FormularioEdicaoItem({
  item,
  salvando,
  onSalvar,
  onCancelar,
}: FormularioEdicaoItemProps) {
  const [series, setSeries] = useState(String(item.series));
  const [repeticoes, setRepeticoes] = useState(String(item.repeticoes));
  const [carga, setCarga] = useState(String(item.carga));
  const [descanso, setDescanso] = useState(String(item.descanso));
  const [ordem, setOrdem] = useState(String(item.ordem));
  const { erros, tentar } = useErrosAposTentativa<CampoItem>(() =>
    validarItem({ series, repeticoes, carga, descanso, ordem })
  );

  const refRepeticoes = useRef<TextInput>(null);
  const refCarga = useRef<TextInput>(null);
  const refDescanso = useRef<TextInput>(null);
  const refOrdem = useRef<TextInput>(null);

  function confirmar() {
    if (!tentar()) {
      return;
    }

    onSalvar({
      series: lerNumero(series),
      repeticoes: lerNumero(repeticoes),
      carga: lerCarga(carga),
      descanso: lerNumero(descanso),
      ordem: lerNumero(ordem),
    });
  }

  return (
    <View style={estilos.card}>
      <View style={estilos.cabecalho}>
        <MiniaturaExercicio uri={item.imagem} tamanho={44} />
        <View style={estilos.titulos}>
          <Text style={estilos.rotulo}>Editando</Text>
          <Text style={estilos.nome} numberOfLines={2}>
            {item.nome}
          </Text>
        </View>
      </View>

      <View style={estilos.grade}>
        <View style={estilos.coluna}>
          <CampoTexto
            rotulo="Séries"
            value={series}
            onChangeText={setSeries}
            keyboardType="number-pad"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => refRepeticoes.current?.focus()}
            erro={erros.series}
          />
        </View>
        <View style={estilos.coluna}>
          <CampoTexto
            rotulo="Repetições"
            value={repeticoes}
            ref={refRepeticoes}
            onChangeText={setRepeticoes}
            keyboardType="number-pad"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => refCarga.current?.focus()}
            erro={erros.repeticoes}
          />
        </View>
      </View>

      <View style={estilos.grade}>
        <View style={estilos.coluna}>
          <CampoTexto
            rotulo="Carga (kg)"
            value={carga}
            ref={refCarga}
            onChangeText={setCarga}
            keyboardType="decimal-pad"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => refDescanso.current?.focus()}
            erro={erros.carga}
          />
        </View>
        <View style={estilos.coluna}>
          <CampoTexto
            rotulo="Descanso (s)"
            value={descanso}
            ref={refDescanso}
            onChangeText={setDescanso}
            keyboardType="number-pad"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => refOrdem.current?.focus()}
            erro={erros.descanso}
          />
        </View>
      </View>

      <CampoTexto
        rotulo="Ordem no treino"
        value={ordem}
        ref={refOrdem}
        onChangeText={setOrdem}
        keyboardType="number-pad"
        returnKeyType="done"
        erro={erros.ordem}
      />

      <View style={estilos.grade}>
        <View style={estilos.coluna}>
          <Botao variante="secundario" onPress={onCancelar} disabled={salvando} haptico={false}>
            CANCELAR
          </Botao>
        </View>
        <View style={estilos.coluna}>
          <Botao onPress={confirmar} carregando={salvando}>
            SALVAR
          </Botao>
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  card: {
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.primaria,
    borderRadius: raios.cartao,
    padding: 16,
    marginBottom: 12,
  },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  titulos: { flex: 1 },
  rotulo: {
    color: cores.primaria,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  nome: { color: cores.texto, fontSize: 16, fontWeight: '700', marginTop: 2 },
  grade: { flexDirection: 'row', gap: 12 },
  coluna: { flex: 1 },
});
