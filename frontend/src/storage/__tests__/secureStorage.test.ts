import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { deleteToken, getToken, saveToken } from '@/storage/secureStorage';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve('token-salvo')),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

afterEach(() => {
  jest.restoreAllMocks();
});

describe('secureStorage no mobile', () => {
  it('guarda, lê e apaga o token no SecureStore', async () => {
    await saveToken('abc');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('access_token', 'abc');
    expect(await getToken()).toBe('token-salvo');
    await deleteToken();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
  });
});

describe('secureStorage na web (ADR-034)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(Platform, 'OS', 'web');
  });

  it('não guarda token: nem no SecureStore nem no localStorage', async () => {
    const setItem = jest.fn();
    const getItem = jest.fn();
    const removeItem = jest.fn();
    Object.defineProperty(globalThis, 'localStorage', {
      value: { setItem, getItem, removeItem },
      configurable: true,
    });

    await saveToken('abc');
    expect(await getToken()).toBeNull();
    await deleteToken();

    expect(setItem).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});
