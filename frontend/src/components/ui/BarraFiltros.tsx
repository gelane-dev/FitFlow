import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { cores, raios } from '@/theme';

import { Chip } from './Chip';
import { Pressionavel } from './Pressionavel';

/** Espera após a última tecla antes de avisar a busca (evita uma requisição por letra). */
export const ESPERA_BUSCA_MS = 300;

export interface FiltroChip {
  valor: string;
  rotulo: string;
}

export interface BarraFiltrosProps {
  /** Chamado ESPERA_BUSCA_MS depois da última alteração do texto. */
  aoBuscar: (texto: string) => void;
  /** Texto inicial da busca. */
  buscaInicial?: string;
  placeholder?: string;
  chips?: FiltroChip[];
  /** `valor` do chip ativo; `null` = nenhum. */
  chipAtivo?: string | null;
  /** Tocar no chip ativo o desmarca (`null`). */
  aoMudarChip?: (valor: string | null) => void;
  testID?: string;
}

/** Busca com espera de 300 ms + chips de filtro (escolha única). */
export function BarraFiltros({
  aoBuscar,
  buscaInicial = '',
  placeholder = 'Buscar',
  chips,
  chipAtivo = null,
  aoMudarChip,
  testID,
}: BarraFiltrosProps) {
  const [texto, setTexto] = useState(buscaInicial);
  const ultimoEnviado = useRef(buscaInicial);
  const aoBuscarRef = useRef(aoBuscar);

  useEffect(() => {
    aoBuscarRef.current = aoBuscar;
  });

  useEffect(() => {
    if (texto === ultimoEnviado.current) {
      return;
    }

    const espera = setTimeout(() => {
      ultimoEnviado.current = texto;
      aoBuscarRef.current(texto);
    }, ESPERA_BUSCA_MS);

    return () => clearTimeout(espera);
  }, [texto]);

  return (
    <View style={estilos.raiz} testID={testID}>
      <View style={estilos.caixa}>
        <Ionicons name="search-outline" size={18} color={cores.textoTerciario} />
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder={placeholder}
          placeholderTextColor={cores.textoPlaceholder}
          selectionColor={cores.primaria}
          cursorColor={cores.primaria}
          style={estilos.entrada}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={placeholder}
          testID="filtro-busca"
        />
        {texto ? (
          <Pressionavel
            onPress={() => setTexto('')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Limpar busca"
            testID="filtro-limpar"
          >
            <Ionicons name="close-circle" size={20} color={cores.textoTerciario} />
          </Pressionavel>
        ) : null}
      </View>

      {chips && chips.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
          {chips.map((chip) => (
            <Chip
              key={chip.valor}
              rotulo={chip.rotulo}
              selecionado={chipAtivo === chip.valor}
              onPress={() => aoMudarChip?.(chipAtivo === chip.valor ? null : chip.valor)}
              testID={`filtro-chip-${chip.valor}`}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { gap: 12, marginBottom: 12 },
  caixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    backgroundColor: cores.superficieElevada,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raios.input,
    paddingHorizontal: 14,
  },
  entrada: { flex: 1, color: cores.texto, fontSize: 15, paddingVertical: 0, height: 46 },
  chips: { gap: 8, paddingVertical: 5 },
});
