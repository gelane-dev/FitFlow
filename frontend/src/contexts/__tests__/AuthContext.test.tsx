import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AxiosError } from 'axios';
import { ReactNode } from 'react';
import { Platform } from 'react-native';

import { ProvedorAutenticacao } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { login, logout } from '@/services/auth.service';
import { buscarUsuario } from '@/services/usuario.service';
import { deleteToken, getToken, saveToken } from '@/storage/secureStorage';

jest.mock('@/services/auth.service', () => ({ login: jest.fn(), logout: jest.fn() }));
jest.mock('@/services/usuario.service', () => ({ buscarUsuario: jest.fn() }));
jest.mock('@/storage/secureStorage', () => ({
  saveToken: jest.fn(() => Promise.resolve()),
  getToken: jest.fn(() => Promise.resolve(null)),
  deleteToken: jest.fn(() => Promise.resolve()),
}));
// Captura o callback que o AuthContext registra no interceptor do axios.
let aoSessaoExpiradaRegistrada: ((motivo?: string) => void) | null = null;
jest.mock('@/services/api', () => ({
  registrarSessaoExpirada: (callback: ((motivo?: string) => void) | null) => {
    aoSessaoExpiradaRegistrada = callback;
  },
}));
jest.mock('@/utils/lembretes', () => ({ cancelarLembretes: jest.fn(() => Promise.resolve()) }));

const loginMock = login as jest.Mock;
const logoutMock = logout as jest.Mock;
const buscarUsuarioMock = buscarUsuario as jest.Mock;
const getTokenMock = getToken as jest.Mock;

const ADMIN = { id: 1, email: 'admin@x.com', tipo: 'admin', foto: null };

function wrapper({ children }: { children: ReactNode }) {
  return <ProvedorAutenticacao>{children}</ProvedorAutenticacao>;
}

function erroHttp(status: number, data: unknown) {
  const resposta = { status, data, statusText: '', headers: {}, config: {} };

  return new AxiosError('falhou', 'ERR_BAD_REQUEST', undefined, null, resposta as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  getTokenMock.mockResolvedValue(null);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('sessão na web (cookie, ADR-034)', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'web');
  });

  it('restaura a sessão chamando GET /perfil mesmo sem token guardado', async () => {
    buscarUsuarioMock.mockResolvedValue(ADMIN);
    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.carregandoSessao).toBe(false));

    expect(buscarUsuarioMock).toHaveBeenCalledTimes(1);
    expect(result.current.usuario).toEqual(ADMIN);
  });

  it('401 ao restaurar significa "sem sessão": vai ao login, sem erro de conexão', async () => {
    buscarUsuarioMock.mockRejectedValue(erroHttp(401, { detail: 'Not authenticated' }));
    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.carregandoSessao).toBe(false));

    expect(result.current.usuario).toBeNull();
    expect(result.current.erroSessao).toBeNull();
  });

  it('entrar busca o perfil depois do login (o cookie vem do servidor; secureStorage é no-op na web)', async () => {
    buscarUsuarioMock.mockRejectedValueOnce(erroHttp(401, {})).mockResolvedValueOnce(ADMIN);
    loginMock.mockResolvedValue({ access_token: 'jwt', token_type: 'bearer' });
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.carregandoSessao).toBe(false));

    await act(async () => {
      await result.current.entrar({ email: 'admin@x.com', senha: 'Senha@123' });
    });

    expect(saveToken).toHaveBeenCalledWith('jwt'); // no-op na web (secureStorage); o contexto só delega
    expect(result.current.usuario).toEqual(ADMIN);
  });

  it('sair chama POST /logout e limpa o usuário, mesmo se o servidor falhar', async () => {
    buscarUsuarioMock.mockResolvedValue(ADMIN);
    logoutMock.mockRejectedValue(new Error('rede'));
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.usuario).toEqual(ADMIN));

    await act(async () => {
      await result.current.sair();
    });

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(deleteToken).toHaveBeenCalled();
    expect(result.current.usuario).toBeNull();
  });
});

describe('sessão no mobile (inalterada)', () => {
  it('sem token não chama o servidor ao abrir', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.carregandoSessao).toBe(false));

    expect(buscarUsuarioMock).not.toHaveBeenCalled();
    expect(result.current.usuario).toBeNull();
  });

  it('com token restaura o perfil; sair não chama POST /logout', async () => {
    getTokenMock.mockResolvedValue('jwt');
    buscarUsuarioMock.mockResolvedValue(ADMIN);
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.usuario).toEqual(ADMIN));

    await act(async () => {
      await result.current.sair();
    });

    expect(logoutMock).not.toHaveBeenCalled();
    expect(deleteToken).toHaveBeenCalled();
    expect(result.current.usuario).toBeNull();
  });
});

describe('login com 403 do contrato', () => {
  it.each([
    'Cadastro aguardando aprovação da recepção',
    'Cadastro não aprovado. Procure a recepção',
    'Conta desativada',
  ])('mostra "%s" como erro amigável e não entra', async (detail) => {
    loginMock.mockRejectedValue(erroHttp(403, { detail }));
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.carregandoSessao).toBe(false));

    await act(async () => {
      await result.current.entrar({ email: 'a@x.com', senha: 'Senha@123' });
    });

    expect(result.current.erro).toBe(detail);
    expect(result.current.usuario).toBeNull();
    expect(saveToken).not.toHaveBeenCalled();
    expect(buscarUsuarioMock).not.toHaveBeenCalled();
  });
});

describe('logout forçado por conta desativada (GB-10)', () => {
  it('401 "Conta desativada" volta ao login com o aviso, que some ao tentar entrar de novo', async () => {
    getTokenMock.mockResolvedValue('jwt');
    buscarUsuarioMock.mockResolvedValue(ADMIN);
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.usuario).toEqual(ADMIN));
    expect(result.current.avisoLogin).toBeNull();

    await act(async () => {
      aoSessaoExpiradaRegistrada?.('Conta desativada');
    });

    expect(result.current.usuario).toBeNull();
    expect(result.current.avisoLogin).toBe('Conta desativada');

    loginMock.mockRejectedValue(erroHttp(401, { detail: 'Credenciais inválidas' }));
    await act(async () => {
      await result.current.entrar({ email: 'a@x.com', senha: 'Senha@123' });
    });

    expect(result.current.avisoLogin).toBeNull();
  });

  it('outros 401 (token expirado) não mostram aviso', async () => {
    getTokenMock.mockResolvedValue('jwt');
    buscarUsuarioMock.mockResolvedValue(ADMIN);
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.usuario).toEqual(ADMIN));

    await act(async () => {
      aoSessaoExpiradaRegistrada?.('Token inválido ou expirado');
    });

    expect(result.current.usuario).toBeNull();
    expect(result.current.avisoLogin).toBeNull();
  });
});
