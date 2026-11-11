import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'access_token';

// Na web (ADR-034) a sessão vive num cookie HttpOnly gravado pelo backend: o JavaScript
// nunca vê o token e nada vai para o localStorage. Estas funções viram no-op lá.
// O mobile segue no SecureStore com Bearer.
function ehWeb(): boolean {
  return Platform.OS === 'web';
}

export async function saveToken(token: string) {
  if (ehWeb()) {
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken() {
  if (ehWeb()) {
    return null;
  }
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteToken() {
  if (ehWeb()) {
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
