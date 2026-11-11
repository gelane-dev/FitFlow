import { Stack } from 'expo-router';

import { cores } from '@/theme';

export const unstable_settings = { anchor: '(abas)' };

/**
 * Área do admin: abas no grupo (abas); detalhes e fluxos (GA-05 em diante) abrem por cima, sem a barra.
 */
export default function LayoutAdmin() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }} />
  );
}
