import { Tabs } from 'expo-router';

import { BarraAbas, DefinicaoAba } from '@/components/ui/BarraAbas';
import { CenaAba } from '@/components/ui/CenaAba';
import { cores } from '@/theme';

// A chave é o nome do arquivo da aba. Início é /painel (decisão registrada no ADR-031).
const ABAS: Record<string, DefinicaoAba> = {
  painel: { rotulo: 'Início', icone: 'home-outline', iconeAtivo: 'home' },
  'alunos/index': { rotulo: 'Alunos', icone: 'people-outline', iconeAtivo: 'people' },
  fichas: { rotulo: 'Fichas', icone: 'clipboard-outline', iconeAtivo: 'clipboard' },
  exercicios: { rotulo: 'Exercícios', icone: 'barbell-outline', iconeAtivo: 'barbell' },
  perfil: { rotulo: 'Perfil', icone: 'person-outline', iconeAtivo: 'person' },
};

export default function AbasProfessor() {
  return (
    <Tabs
      tabBar={(props) => <BarraAbas {...props} abas={ABAS} />}
      screenLayout={({ children }) => <CenaAba>{children}</CenaAba>}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: cores.fundo } }}
    >
      <Tabs.Screen name="painel" />
      <Tabs.Screen name="alunos/index" />
      <Tabs.Screen name="fichas" />
      <Tabs.Screen name="exercicios" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
