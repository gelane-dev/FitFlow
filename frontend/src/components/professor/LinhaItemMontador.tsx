import { StyleSheet, Text, View } from 'react-native';

import { BotaoIcone } from '@/components/professor/BotaoIcone';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { cores, raios } from '@/theme';
import { ErrosItemMontador, ItemMontador, LIMITE_OBSERVACAO } from '@/utils/montadorFicha';

type MudancasItem = Partial<
  Pick<ItemMontador, 'series' | 'repeticoes' | 'carga' | 'descanso' | 'observacao'>
>;

interface LinhaItemMontadorProps {
  item: ItemMontador;
  posicao: number;
  total: number;
  erros?: ErrosItemMontador;
  desabilitado?: boolean;
  aoAlterar: (mudancas: MudancasItem) => void;
  aoSubir: () => void;
  aoDescer: () => void;
  aoDuplicar: () => void;
  aoRemover: () => void;
  testID?: string;
}

/** Um exercício na divisão: séries, repetições, carga, descanso, observação e ações (subir/descer/duplicar/remover). */
export function LinhaItemMontador({
  item,
  posicao,
  total,
  erros = {},
  desabilitado = false,
  aoAlterar,
  aoSubir,
  aoDescer,
  aoDuplicar,
  aoRemover,
  testID,
}: LinhaItemMontadorProps) {
  const nome = item.nome;
  const id = (sufixo: string) => (testID ? `${testID}-${sufixo}` : undefined);

  return (
    <View style={estilos.cartao} testID={testID}>
      <View style={estilos.topo}>
        <View style={estilos.numero}>
          <Text style={estilos.textoNumero}>{posicao + 1}</Text>
        </View>
        <View style={estilos.titulos}>
          <Text style={estilos.nome} numberOfLines={2}>
            {nome}
          </Text>
          <Text style={estilos.grupo} numberOfLines={1}>
            {item.grupoMuscular}
          </Text>
        </View>
      </View>

      <View style={estilos.campos}>
        <View style={estilos.campo}>
          <CampoTexto
            rotulo="Séries"
            value={item.series}
            onChangeText={(v) => aoAlterar({ series: v.replace(/\D/g, '') })}
            keyboardType="number-pad"
            erro={erros.series}
            editable={!desabilitado}
            accessibilityLabel={`Séries de ${nome}`}
            testID={id('series')}
          />
        </View>
        <View style={estilos.campo}>
          <CampoTexto
            rotulo="Reps"
            value={item.repeticoes}
            onChangeText={(v) => aoAlterar({ repeticoes: v.replace(/\D/g, '') })}
            keyboardType="number-pad"
            erro={erros.repeticoes}
            editable={!desabilitado}
            accessibilityLabel={`Repetições de ${nome}`}
            testID={id('repeticoes')}
          />
        </View>
        <View style={estilos.campo}>
          <CampoTexto
            rotulo="Carga (kg)"
            value={item.carga}
            placeholder="opcional"
            onChangeText={(v) => aoAlterar({ carga: v })}
            keyboardType="decimal-pad"
            erro={erros.carga}
            editable={!desabilitado}
            accessibilityLabel={`Carga sugerida de ${nome}`}
            testID={id('carga')}
          />
        </View>
        <View style={estilos.campo}>
          <CampoTexto
            rotulo="Descanso (s)"
            value={item.descanso}
            onChangeText={(v) => aoAlterar({ descanso: v.replace(/\D/g, '') })}
            keyboardType="number-pad"
            erro={erros.descanso}
            editable={!desabilitado}
            accessibilityLabel={`Descanso de ${nome}`}
            testID={id('descanso')}
          />
        </View>
      </View>

      <CampoTexto
        rotulo="Observação (opcional)"
        placeholder="Ex.: cadência lenta na descida"
        value={item.observacao}
        onChangeText={(v) => aoAlterar({ observacao: v })}
        maxLength={LIMITE_OBSERVACAO}
        erro={erros.observacao}
        editable={!desabilitado}
        accessibilityLabel={`Observação de ${nome}`}
        testID={id('observacao')}
      />

      <View style={estilos.acoes}>
        <BotaoIcone
          icone="arrow-up"
          rotulo={`Subir ${nome}`}
          onPress={aoSubir}
          desabilitado={desabilitado || posicao === 0}
          testID={id('subir')}
        />
        <BotaoIcone
          icone="arrow-down"
          rotulo={`Descer ${nome}`}
          onPress={aoDescer}
          desabilitado={desabilitado || posicao === total - 1}
          testID={id('descer')}
        />
        <BotaoIcone
          icone="copy-outline"
          rotulo={`Duplicar ${nome}`}
          onPress={aoDuplicar}
          desabilitado={desabilitado}
          testID={id('duplicar')}
        />
        <BotaoIcone
          icone="trash-outline"
          rotulo={`Remover ${nome}`}
          onPress={aoRemover}
          desabilitado={desabilitado}
          perigo
          testID={id('remover')}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.cartao,
    padding: 14,
    marginBottom: 12,
  },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  numero: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cores.primariaSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoNumero: { color: cores.primaria, fontSize: 14, fontWeight: '800' },
  titulos: { flex: 1 },
  nome: { color: cores.texto, fontSize: 16, fontWeight: '700' },
  grupo: { color: cores.textoSecundario, fontSize: 13, marginTop: 2 },
  campos: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10 },
  campo: { flexBasis: '22%', flexGrow: 1, minWidth: 70 },
  acoes: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
});
