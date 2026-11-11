import { Stack } from 'expo-router';

import { ProvedorPermissoesRecepcao } from '@/hooks/useRecepcaoPermissoes';
import { cores } from '@/theme';

export const unstable_settings = { anchor: '(abas)' };

/**
 * Área da recepção: abas no grupo (abas); detalhes e fluxos (aluno, novo aluno, comprovante) abrem
 * por cima, sem a barra. As permissões do perfil (GET /perfil/recepcao) valem para todas as telas.
 */
export default function LayoutRecepcao() {
  return (
    <ProvedorPermissoesRecepcao>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }} />
    </ProvedorPermissoesRecepcao>
  );
}
