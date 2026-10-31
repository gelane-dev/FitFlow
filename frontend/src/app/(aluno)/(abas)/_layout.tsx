import { Tabs } from 'expo-router';

import { BarraAbas, DefinicaoAba } from '@/components/ui/BarraAbas';
import { CenaAba } from '@/components/ui/CenaAba';
import { cores } from '@/theme';

const ABAS: Record<string, DefinicaoAba> = {
  'aluno/index': { rotulo: 'Início', icone: 'home-outline', iconeAtivo: 'home' },
  'aluno/treinos': { rotulo: 'Treinos', icone: 'barbell-outline', iconeAtivo: 'barbell' },
  'aluno/historico/index': { rotulo: 'Histórico', icone: 'time-outline', iconeAtivo: 'time' },
  'aluno/evolucao/index': {
    rotulo: 'Evolução',
    icone: 'trending-up-outline',
    iconeAtivo: 'trending-up',
  },
  perfil: { rotulo: 'Perfil', icone: 'person-outline', iconeAtivo: 'person' },
};

export default function AbasAluno() {
  return (
    <Tabs
      tabBar={(props) => <BarraAbas {...props} abas={ABAS} />}
      screenLayout={({ children }) => <CenaAba>{children}</CenaAba>}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: cores.fundo } }}
    >
      <Tabs.Screen name="aluno/index" />
      <Tabs.Screen name="aluno/treinos" />
      <Tabs.Screen name="aluno/historico/index" />
      <Tabs.Screen name="aluno/evolucao/index" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
