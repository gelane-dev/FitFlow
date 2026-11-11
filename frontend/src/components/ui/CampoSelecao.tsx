import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { cores, raios } from '@/theme';
import { normalizar } from '@/utils/busca';

import { corBordaCampo } from './CampoTexto';
import { Modal } from './Modal';
import { Pressionavel } from './Pressionavel';

export interface OpcaoSelecao<V extends string | number = string> {
  valor: V;
  rotulo: string;
  /** Linha de apoio abaixo do rótulo (ex.: preço do plano). */
  descricao?: string;
}

export interface CampoSelecaoProps<V extends string | number = string> {
  rotulo?: string;
  opcoes: OpcaoSelecao<V>[];
  /** `null` = nada escolhido. */
  valor: V | null;
  aoMudar: (valor: V | null) => void;
  placeholder?: string;
  erro?: string | null;
  /** Mostra a busca no modal. Padrão: só quando há mais de 7 opções. */
  buscavel?: boolean;
  /** Permite limpar a escolha (opção "Nenhum" no topo da lista). */
  limpavel?: boolean;
  disabled?: boolean;
  testID?: string;
}

const LIMITE_BUSCA = 7;

/** Campo de escolha única: parece um campo de texto; toca para abrir a lista (com busca) num `Modal`. */
export function CampoSelecao<V extends string | number = string>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
  placeholder = 'Selecione',
  erro,
  buscavel,
  limpavel = false,
  disabled = false,
  testID,
}: CampoSelecaoProps<V>) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');

  const escolhida = opcoes.find((o) => o.valor === valor);
  const comBusca = buscavel ?? opcoes.length > LIMITE_BUSCA;

  const filtradas = useMemo(() => {
    const termo = normalizar(busca);

    return termo ? opcoes.filter((o) => normalizar(`${o.rotulo} ${o.descricao ?? ''}`).includes(termo)) : opcoes;
  }, [opcoes, busca]);

  function fechar() {
    setAberto(false);
    setBusca('');
  }

  function escolher(novo: V | null) {
    aoMudar(novo);
    fechar();
  }

  return (
    <View style={estilos.grupo}>
      {rotulo ? <Text style={estilos.rotulo}>{rotulo}</Text> : null}

      <Pressionavel
        onPress={() => setAberto(true)}
        disabled={disabled}
        escala={0.99}
        style={[estilos.caixa, { borderColor: corBordaCampo(false, erro) }]}
        accessibilityRole="button"
        accessibilityLabel={`${rotulo ?? placeholder}: ${escolhida?.rotulo ?? 'nada selecionado'}`}
        testID={testID}
      >
        <Text style={[estilos.valor, !escolhida && estilos.placeholder]} numberOfLines={1}>
          {escolhida?.rotulo ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={cores.textoTerciario} />
      </Pressionavel>

      {erro ? <Text style={estilos.erro}>{erro}</Text> : null}

      <Modal visivel={aberto} titulo={rotulo ?? placeholder} aoFechar={fechar} testID="selecao-modal">
        {comBusca ? (
          <View style={estilos.busca}>
            <Ionicons name="search-outline" size={18} color={cores.textoTerciario} />
            <TextInput
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar"
              placeholderTextColor={cores.textoPlaceholder}
              selectionColor={cores.primaria}
              style={estilos.entradaBusca}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Buscar opção"
              testID="selecao-busca"
            />
          </View>
        ) : null}

        {limpavel && valor !== null ? (
          <Opcao rotulo="Nenhum" selecionada={false} aoEscolher={() => escolher(null)} testID="selecao-limpar" />
        ) : null}

        {filtradas.map((opcao) => (
          <Opcao
            key={String(opcao.valor)}
            rotulo={opcao.rotulo}
            descricao={opcao.descricao}
            selecionada={opcao.valor === valor}
            aoEscolher={() => escolher(opcao.valor)}
            testID={`selecao-opcao-${opcao.valor}`}
          />
        ))}

        {filtradas.length === 0 ? <Text style={estilos.vazio}>Nenhuma opção encontrada.</Text> : null}
      </Modal>
    </View>
  );
}

function Opcao({
  rotulo,
  descricao,
  selecionada,
  aoEscolher,
  testID,
}: {
  rotulo: string;
  descricao?: string;
  selecionada: boolean;
  aoEscolher: () => void;
  testID?: string;
}) {
  return (
    <Pressionavel
      onPress={aoEscolher}
      escala={0.99}
      style={[estilos.opcao, selecionada && estilos.opcaoSelecionada]}
      accessibilityRole="radio"
      accessibilityState={{ selected: selecionada, checked: selecionada }}
      testID={testID}
    >
      <View style={estilos.textosOpcao}>
        <Text style={[estilos.rotuloOpcao, selecionada && estilos.rotuloOpcaoSelecionada]}>{rotulo}</Text>
        {descricao ? <Text style={estilos.descricaoOpcao}>{descricao}</Text> : null}
      </View>
      {selecionada ? <Ionicons name="checkmark" size={20} color={cores.primaria} /> : null}
    </Pressionavel>
  );
}

const estilos = StyleSheet.create({
  grupo: { marginBottom: 18 },
  rotulo: { color: cores.textoSecundario, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  caixa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 52,
    backgroundColor: cores.superficieElevada,
    borderWidth: 1,
    borderRadius: raios.input,
    paddingHorizontal: 14,
  },
  valor: { flex: 1, color: cores.texto, fontSize: 15 },
  placeholder: { color: cores.textoPlaceholder },
  erro: { color: cores.perigo, fontSize: 12, marginTop: 6 },
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    backgroundColor: cores.superficieElevada,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.input,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  entradaBusca: { flex: 1, color: cores.texto, fontSize: 15, height: 46, paddingVertical: 0 },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: raios.botao,
  },
  opcaoSelecionada: { backgroundColor: cores.primariaSuave },
  textosOpcao: { flex: 1 },
  rotuloOpcao: { color: cores.texto, fontSize: 15 },
  rotuloOpcaoSelecionada: { fontWeight: '700' },
  descricaoOpcao: { color: cores.textoSecundario, fontSize: 12, marginTop: 2 },
  vazio: { color: cores.textoSecundario, fontSize: 14, textAlign: 'center', paddingVertical: 24 },
});
