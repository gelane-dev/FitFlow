import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { EstadoErro } from '@/components/ui/EstadoErro';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProvedorAlerta } from '@/contexts/AlertaContext';
import { ProvedorAutenticacao } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { cores } from '@/theme';

function TelaCarregando() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: cores.fundo,
        justifyContent: 'center',
        padding: 32,
        gap: 16,
      }}
    >
      <Skeleton largura="40%" altura={34} />
      <Skeleton altura={120} raio={18} />
      <Skeleton altura={64} raio={18} />
    </View>
  );
}

function Rotas() {
  const { usuario, carregandoSessao, erroSessao, restaurarSessao } = useAuth();

  if (carregandoSessao) {
    return <TelaCarregando />;
  }

  if (!usuario && erroSessao) {
    return (
      <View style={{ flex: 1, backgroundColor: cores.fundo, justifyContent: 'center' }}>
        <EstadoErro mensagem={erroSessao} aoTentarNovamente={restaurarSessao} />
      </View>
    );
  }

  const ehProfessor = usuario?.tipo === 'professor';
  const ehAluno = usuario?.tipo === 'aluno';
  const ehAdmin = usuario?.tipo === 'admin';
  const ehRecepcao = usuario?.tipo === 'recepcao';

  // Os grupos (publico), (professor), (aluno), (admin) e (recepcao) não aparecem na URL: os paths
  // continuam /, /cadastro, /fichas, /aluno/..., /admin/..., /recepcao/... (ADR-031).
  // O admin tem grupo próprio e deixou de entrar em (aluno) (TD-50).
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }}>
      <Stack.Protected guard={!usuario}>
        <Stack.Screen name="(publico)" />
      </Stack.Protected>

      <Stack.Protected guard={ehProfessor}>
        <Stack.Screen name="(professor)" />
      </Stack.Protected>

      <Stack.Protected guard={ehAluno}>
        <Stack.Screen name="(aluno)" />
      </Stack.Protected>

      <Stack.Protected guard={ehAdmin}>
        <Stack.Screen name="(admin)" />
      </Stack.Protected>

      <Stack.Protected guard={ehRecepcao}>
        <Stack.Screen name="(recepcao)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontesCarregadas] = useFonts({
    OrbitronMedium: require('@/assets/fonts/Orbitron-Medium.ttf'),
  });

  if (!fontesCarregadas) {
    return null;
  }

  return (
    <ProvedorAutenticacao>
      <ProvedorAlerta>
        <StatusBar style="light" />
        <Rotas />
      </ProvedorAlerta>
    </ProvedorAutenticacao>
  );
}
