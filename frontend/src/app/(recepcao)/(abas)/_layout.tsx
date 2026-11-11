import { Tabs } from 'expo-router';

import { BarraAbas, DefinicaoAba, useOpcoesBarraAbas } from '@/components/ui/BarraAbas';
import { CenaAba } from '@/components/ui/CenaAba';
import { cores } from '@/theme';

// A chave é o nome do arquivo da aba (Contrato-Gestao, seção Frontend).
const ABAS: Record<string, DefinicaoAba> = {
  'recepcao/index': { rotulo: 'Painel', icone: 'speedometer-outline', iconeAtivo: 'speedometer' },
  'recepcao/entrada': { rotulo: 'Entrada', icone: 'enter-outline', iconeAtivo: 'enter' },
  'recepcao/alunos/index': { rotulo: 'Alunos', icone: 'people-outline', iconeAtivo: 'people' },
  'recepcao/pagamentos/index': { rotulo: 'Pagamentos', icone: 'card-outline', iconeAtivo: 'card' },
  'recepcao/perfil': { rotulo: 'Perfil', icone: 'person-outline', iconeAtivo: 'person' },
};

export default function AbasRecepcao() {
  const posicao = useOpcoesBarraAbas();

  return (
    <Tabs
      tabBar={(props) => <BarraAbas {...props} abas={ABAS} />}
      screenLayout={({ children }) => <CenaAba>{children}</CenaAba>}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: cores.fundo }, ...posicao }}
    >
      <Tabs.Screen name="recepcao/index" />
      <Tabs.Screen name="recepcao/entrada" />
      <Tabs.Screen name="recepcao/alunos/index" />
      <Tabs.Screen name="recepcao/pagamentos/index" />
      <Tabs.Screen name="recepcao/perfil" />
    </Tabs>
  );
}
