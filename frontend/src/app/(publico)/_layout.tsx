import { Stack } from 'expo-router';

import { cores } from '@/theme';

/** Rotas sem login: / (login) e /cadastro. */
export default function LayoutPublico() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }} />
  );
}
