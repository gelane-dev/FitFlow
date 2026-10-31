import { useIsFocused } from 'expo-router';
import { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

/**
 * Envolve cada cena de um `Tabs`. Na web o react-native-screens não esconde as
 * abas inativas (elas ficam sobrepostas e visíveis para leitores de tela e testes),
 * então aqui elas recebem `display: none`. No nativo não faz nada.
 *
 *   <Tabs screenLayout={({ children }) => <CenaAba>{children}</CenaAba>} />
 */
export function CenaAba({ children }: { children: ReactNode }) {
  const focada = useIsFocused();

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return <View style={[estilos.cena, !focada && estilos.oculta]}>{children}</View>;
}

const estilos = StyleSheet.create({
  cena: { flex: 1 },
  oculta: { display: 'none' },
});
