import { Stack } from 'expo-router';

import { cores } from '@/theme';

export const unstable_settings = { anchor: '(abas)' };

/**
 * Área do aluno (e do admin): abas no grupo (abas); detalhes e fluxos
 * (treino, ficha, sessão, avaliações, lembretes) abrem por cima, sem a barra.
 */
export default function LayoutAluno() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }} />
  );
}
