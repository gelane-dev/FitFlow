import { Ionicons } from '@expo/vector-icons';
import type { Tabs } from 'expo-router';
import { ComponentProps, useContext } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContextoAutenticacao } from '@/contexts/AuthContext';
import { alturaBarraAbas, cores, fonteDisplay, raios } from '@/theme';
import { mostrarAlerta } from '@/utils/alerta';

import { tocarHaptico } from './haptics';
import { Pressionavel } from './Pressionavel';
import { useLarguraTela } from './useLarguraTela';

type PropsBarra = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

type NomeIcone = keyof typeof Ionicons.glyphMap;

export interface DefinicaoAba {
  rotulo: string;
  /** Ícone de contorno (aba inativa). */
  icone: NomeIcone;
  /** Ícone preenchido (aba ativa). */
  iconeAtivo: NomeIcone;
}

/** Largura da sidebar do modo largo. */
export const larguraSidebar = 248;

/**
 * Opções de `Tabs.screenOptions` que acompanham a `BarraAbas`: no modo largo (>= 1024) a barra
 * vira sidebar à esquerda, então o navegador precisa posicionar a barra à esquerda.
 */
export function useOpcoesBarraAbas() {
  const { ehLargo } = useLarguraTela();

  return { tabBarPosition: ehLargo ? ('left' as const) : ('bottom' as const) };
}

/**
 * Navegação principal do FitFlow. Use no layout das abas:
 *
 *   const posicao = useOpcoesBarraAbas();
 *   <Tabs tabBar={(props) => <BarraAbas {...props} abas={ABAS} />} screenOptions={{ ...posicao }} />
 *
 * `abas` mapeia o nome da rota (como declarado em `Tabs.Screen`) para rótulo e ícones.
 * Rotas sem definição em `abas` não aparecem. Abaixo de 1024 é a barra inferior; a partir
 * de 1024 (web e tablet), uma sidebar fixa com logo, itens, usuário e "Sair".
 */
export function BarraAbas(props: PropsBarra & { abas: Record<string, DefinicaoAba> }) {
  const { ehLargo } = useLarguraTela();

  return ehLargo ? <Sidebar {...props} /> : <BarraInferior {...props} />;
}

function Sidebar({ state, navigation, abas }: PropsBarra & { abas: Record<string, DefinicaoAba> }) {
  const insets = useSafeAreaInsets();
  const { usuario, sair } = useContext(ContextoAutenticacao);

  function confirmarSaida() {
    mostrarAlerta('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => sair?.() },
    ]);
  }

  return (
    <View
      style={[estilos.sidebar, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}
      testID="barra-lateral"
      accessibilityRole="tablist"
    >
      <View style={estilos.marca}>
        <Image source={require('@/assets/images/branding/logo-fitflow.png')} style={estilos.logo} />
        <Text style={estilos.nomeMarca}>FITFLOW</Text>
      </View>

      <View style={estilos.itens}>
        {state.routes.map((rota, indice) => {
          const definicao = abas[rota.name];

          if (!definicao) {
            return null;
          }

          const ativa = state.index === indice;
          const cor = ativa ? cores.primaria : cores.textoSecundario;

          function aoTocar() {
            const evento = navigation.emit({ type: 'tabPress', target: rota.key, canPreventDefault: true });

            if (!ativa && !evento.defaultPrevented) {
              navigation.navigate(rota.name, rota.params);
            }
          }

          return (
            <Pressionavel
              key={rota.key}
              onPress={aoTocar}
              escala={0.98}
              style={[estilos.item, ativa && estilos.itemAtivo]}
              testID={`aba-${definicao.rotulo}`}
              accessibilityRole="tab"
              accessibilityLabel={definicao.rotulo}
              accessibilityState={{ selected: ativa }}
            >
              <View style={[estilos.marcador, ativa && estilos.marcadorAtivo]} />
              <Ionicons name={ativa ? definicao.iconeAtivo : definicao.icone} size={22} color={cor} />
              <Text style={[estilos.rotuloItem, { color: cor }]} numberOfLines={1}>
                {definicao.rotulo}
              </Text>
            </Pressionavel>
          );
        })}
      </View>

      <View style={estilos.rodape}>
        {usuario?.email ? (
          <Text style={estilos.usuario} numberOfLines={1} testID="barra-lateral-usuario">
            {usuario.email}
          </Text>
        ) : null}

        <Pressionavel
          onPress={confirmarSaida}
          style={estilos.item}
          testID="botao-sair-barra"
          accessibilityRole="button"
          accessibilityLabel="Sair da conta"
        >
          <View style={estilos.marcador} />
          <Ionicons name="log-out-outline" size={22} color={cores.textoSecundario} />
          <Text style={[estilos.rotuloItem, { color: cores.textoSecundario }]}>Sair</Text>
        </Pressionavel>
      </View>
    </View>
  );
}

function BarraInferior({ state, navigation, abas }: PropsBarra & { abas: Record<string, DefinicaoAba> }) {
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
  sidebar: {
    width: larguraSidebar,
    backgroundColor: cores.superficie,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: cores.borda,
    paddingHorizontal: 12,
  },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, marginBottom: 28 },
  logo: { width: 40, height: 40 },
  nomeMarca: { color: cores.primaria, fontFamily: fonteDisplay, fontSize: 15, letterSpacing: 1 },
  itens: { flex: 1, gap: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    borderRadius: raios.botao,
    paddingRight: 12,
  },
  itemAtivo: { backgroundColor: cores.primariaSuave },
  marcador: { width: 3, height: 24, borderRadius: 2, backgroundColor: 'transparent' },
  marcadorAtivo: { backgroundColor: cores.primaria },
  rotuloItem: { fontSize: 15, fontWeight: '600', flex: 1 },
  rodape: {
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cores.borda,
    paddingTop: 12,
  },
  usuario: { color: cores.textoTerciario, fontSize: 12, paddingHorizontal: 8 },
});
