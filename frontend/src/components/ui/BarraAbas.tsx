import { Ionicons } from '@expo/vector-icons';
import type { Tabs } from 'expo-router';
import { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { alturaBarraAbas, cores } from '@/theme';

import { tocarHaptico } from './haptics';
import { Pressionavel } from './Pressionavel';

type PropsBarra = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

type NomeIcone = keyof typeof Ionicons.glyphMap;

export interface DefinicaoAba {
  rotulo: string;
  /** Ícone de contorno (aba inativa). */
  icone: NomeIcone;
  /** Ícone preenchido (aba ativa). */
  iconeAtivo: NomeIcone;
}

/**
 * Barra de abas inferior do FitFlow. Use no layout das abas:
 *
 *   <Tabs tabBar={(props) => <BarraAbas {...props} abas={ABAS} />} />
 *
 * `abas` mapeia o nome da rota (como declarado em `Tabs.Screen`) para rótulo e ícones.
 * Rotas sem definição em `abas` não aparecem na barra.
 */
export function BarraAbas({ state, navigation, abas }: PropsBarra & { abas: Record<string, DefinicaoAba> }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[estilos.barra, { height: alturaBarraAbas + insets.bottom, paddingBottom: insets.bottom }]}
      testID="barra-abas"
    >
      {state.routes.map((rota, indice) => {
        const definicao = abas[rota.name];

        if (!definicao) {
          return null;
        }

        const ativa = state.index === indice;
        const cor = ativa ? cores.primaria : cores.textoTerciario;

        function aoTocar() {
          const evento = navigation.emit({ type: 'tabPress', target: rota.key, canPreventDefault: true });

          if (!ativa && !evento.defaultPrevented) {
            tocarHaptico('leve');
            navigation.navigate(rota.name, rota.params);
          }
        }

        return (
          <Pressionavel
            key={rota.key}
            onPress={aoTocar}
            escala={0.94}
            style={estilos.aba}
            testID={`aba-${definicao.rotulo}`}
            accessibilityRole="tab"
            accessibilityLabel={definicao.rotulo}
            accessibilityState={{ selected: ativa }}
          >
            <View style={[estilos.indicador, ativa && estilos.indicadorAtivo]} />
            <Ionicons name={ativa ? definicao.iconeAtivo : definicao.icone} size={24} color={cor} />
            <Text style={[estilos.rotulo, { color: cor }]} numberOfLines={1}>
              {definicao.rotulo}
            </Text>
          </Pressionavel>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    backgroundColor: cores.fundoTranslucido,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cores.borda,
  },
  aba: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  indicador: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginBottom: 3,
  },
  indicadorAtivo: { backgroundColor: cores.primaria },
  rotulo: { fontSize: 11, fontWeight: '600' },
});
