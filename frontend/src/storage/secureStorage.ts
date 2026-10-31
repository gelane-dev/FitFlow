import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'access_token';

// O SecureStore não existe na web; lá o token fica no localStorage (ADR-026).
const ehWeb = Platform.OS === 'web';

export async function saveToken(token: string) {
  if (ehWeb) {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken() {
  if (ehWeb) {
    return localStorage.getItem(TOKEN_KEY);
  }
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteToken() {
  if (ehWeb) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
