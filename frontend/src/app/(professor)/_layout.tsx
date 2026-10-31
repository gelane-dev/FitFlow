import { Stack } from 'expo-router';

import { cores } from '@/theme';

// Garante que as abas fiquem sob qualquer tela de detalhe aberta direto pela URL.
export const unstable_settings = { anchor: '(abas)' };

/**
 * Área do professor: as abas ficam no grupo (abas); telas de detalhe e de fluxo
 * (fichas/[id], exercicios/novo, alunos/[id]...) abrem por cima, sem a barra.
 */
export default function LayoutProfessor() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }} />
  );
}
