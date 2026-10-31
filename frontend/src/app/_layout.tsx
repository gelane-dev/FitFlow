import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';

import { ProvedorAutenticacao } from '@/contexts/AuthContext';

export default function RootLayout() {
  const [fontesCarregadas] = useFonts({
    OrbitronMedium: require('@/assets/fonts/Orbitron-Medium.ttf'),
  });

  if (!fontesCarregadas) {
    return null;
  }

  return (
    <ProvedorAutenticacao>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </ProvedorAutenticacao>
  );
}