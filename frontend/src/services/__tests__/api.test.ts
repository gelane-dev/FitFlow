import type { AxiosAdapter, AxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';

import { api, registrarSessaoExpirada } from '@/services/api';
import { deleteToken, getToken } from '@/storage/secureStorage';

jest.mock('@/storage/secureStorage', () => ({
  getToken: jest.fn(),
  deleteToken: jest.fn(),
}));

const getTokenMock = getToken as jest.Mock;
const deleteTokenMock = deleteToken as jest.Mock;

/** Faz o adapter responder com o status/corpo informado (sem rede real). */
function responderCom(status: number, data: unknown = {}) {
  const adapter: AxiosAdapter = (config) => {
    const resposta = { data, status, statusText: '', headers: {}, config };

    if (status >= 200 && status < 300) {
      return Promise.resolve(resposta);
    }

    return Promise.reject(
      new AxiosError('falhou', 'ERR_BAD_REQUEST', config, null, resposta)
    );
  };

  api.defaults.adapter = adapter;
}

const aoExpirar = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  deleteTokenMock.mockResolvedValue(undefined);
  getTokenMock.mockResolvedValue(null);
  registrarSessaoExpirada(aoExpirar);
});

afterAll(() => registrarSessaoExpirada(null));

describe('interceptor de requisição', () => {
  it('envia o Bearer token quando há token salvo', async () => {
    getTokenMock.mockResolvedValue('abc123');
    let enviada: AxiosRequestConfig | undefined;
    api.defaults.adapter = (config) => {
      enviada = config;

      return Promise.resolve({
        data: {},
        status: 200,
        statusText: '',
        headers: {},
        config,
      });
    };

    await api.get('/perfil');

    expect(enviada?.headers?.Authorization).toBe('Bearer abc123');
  });

  it('não envia Authorization sem token', async () => {
    let enviada: AxiosRequestConfig | undefined;
    api.defaults.adapter = (config) => {
      enviada = config;

      return Promise.resolve({
        data: {},
        status: 200,
        statusText: '',
        headers: {},
        config,
      });
    };

    await api.get('/login-publico');

    expect(enviada?.headers?.Authorization).toBeUndefined();
  });
});

describe('interceptor de 401', () => {
  it('apaga o token e dispara o callback de sessão expirada, repassando o erro', async () => {
    responderCom(401, { detail: 'Token inválido' });

    await expect(api.get('/perfil')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(deleteTokenMock).toHaveBeenCalledTimes(1);
    expect(aoExpirar).toHaveBeenCalledTimes(1);
  });

  it('não desloga quando o 401 vem de PUT /perfil/senha com "Senha atual incorreta"', async () => {
    responderCom(401, { detail: 'Senha atual incorreta' });

    await expect(
      api.put('/perfil/senha', { senha_atual: 'x', nova_senha: 'y' })
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(deleteTokenMock).not.toHaveBeenCalled();
    expect(aoExpirar).not.toHaveBeenCalled();
  });

  it('desloga se o 401 de PUT /perfil/senha for outro (token expirado)', async () => {
    responderCom(401, { detail: 'Token expirado' });

    await expect(api.put('/perfil/senha', {})).rejects.toBeDefined();

    expect(deleteTokenMock).toHaveBeenCalledTimes(1);
    expect(aoExpirar).toHaveBeenCalledTimes(1);
  });

  it('ignora o 401 de POST /login (credenciais erradas)', async () => {
    responderCom(401, { detail: 'Credenciais inválidas' });

    await expect(api.post('/login', {})).rejects.toBeDefined();

    expect(deleteTokenMock).not.toHaveBeenCalled();
    expect(aoExpirar).not.toHaveBeenCalled();
  });

  it('só trata 401: outros status (403, 500) não deslogam', async () => {
    responderCom(403, { detail: 'Proibido' });
    await expect(api.get('/ficha')).rejects.toBeDefined();

    responderCom(500);
    await expect(api.get('/ficha')).rejects.toBeDefined();

    expect(deleteTokenMock).not.toHaveBeenCalled();
    expect(aoExpirar).not.toHaveBeenCalled();
  });

  it('sem callback registrado ainda apaga o token e não lança', async () => {
    registrarSessaoExpirada(null);
    responderCom(401);

    await expect(api.get('/perfil')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(deleteTokenMock).toHaveBeenCalledTimes(1);
  });

  it('respostas 2xx passam direto', async () => {
    responderCom(200, { ok: true });

    await expect(api.get('/perfil')).resolves.toMatchObject({
      data: { ok: true },
    });
    expect(aoExpirar).not.toHaveBeenCalled();
  });
});
