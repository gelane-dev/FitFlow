import { Tabs } from 'expo-router';

import { BarraAbas, DefinicaoAba, useOpcoesBarraAbas } from '@/components/ui/BarraAbas';
import { CenaAba } from '@/components/ui/CenaAba';
import { cores } from '@/theme';

// A chave é o nome do arquivo da aba (Contrato-Gestao, seção Frontend).
const ABAS: Record<string, DefinicaoAba> = {
  'admin/index': { rotulo: 'Painel', icone: 'speedometer-outline', iconeAtivo: 'speedometer' },
  'admin/alunos/index': { rotulo: 'Alunos', icone: 'people-outline', iconeAtivo: 'people' },
  'admin/professores/index': { rotulo: 'Equipe', icone: 'people-circle-outline', iconeAtivo: 'people-circle' },
  'admin/financeiro': { rotulo: 'Financeiro', icone: 'cash-outline', iconeAtivo: 'cash' },
  'admin/perfil': { rotulo: 'Mais', icone: 'ellipsis-horizontal-circle-outline', iconeAtivo: 'ellipsis-horizontal-circle' },
};

export default function AbasAdmin() {
  const posicao = useOpcoesBarraAbas();

  return (
    <Tabs
      tabBar={(props) => <BarraAbas {...props} abas={ABAS} />}
      screenLayout={({ children }) => <CenaAba>{children}</CenaAba>}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: cores.fundo }, ...posicao }}
    >
      <Tabs.Screen name="admin/index" />
      <Tabs.Screen name="admin/alunos/index" />
      <Tabs.Screen name="admin/professores/index" />
      <Tabs.Screen name="admin/financeiro" />
      <Tabs.Screen name="admin/perfil" />
      <Tabs.Screen name="admin/meu-perfil" options={{ href: null }} />
    </Tabs>
  );
}
