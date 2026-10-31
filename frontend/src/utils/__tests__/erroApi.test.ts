import { AxiosError } from 'axios';

import { mensagemErro } from '@/utils/erroApi';

function erroAxios(data?: unknown, status = 400) {
  const erro = new AxiosError('falhou');
  erro.response = { status, data } as AxiosError['response'];

  return erro;
}

describe('mensagemErro', () => {
  it('devolve o detail string da API', () => {
    expect(
      mensagemErro(erroAxios({ detail: 'Ordens duplicadas' }), 'padrão')
    ).toBe('Ordens duplicadas');
  });

  it('usa o padrão quando detail falta, é vazio ou não é string (422)', () => {
    expect(mensagemErro(erroAxios({}), 'padrão')).toBe('padrão');
    expect(mensagemErro(erroAxios({ detail: '' }), 'padrão')).toBe('padrão');
    expect(
      mensagemErro(erroAxios({ detail: [{ msg: 'x' }] }, 422), 'padrão')
    ).toBe('padrão');
    // Sem resposta (rede).
    expect(mensagemErro(new AxiosError('Network Error'), 'padrão')).toBe(
      'padrão'
    );
  });

  it('tempo esgotado vira mensagem de conexão', () => {
    const erro = new AxiosError('timeout of 15000ms exceeded', 'ECONNABORTED');

    expect(mensagemErro(erro, 'padrão')).toBe(
      'O servidor demorou para responder. Verifique sua conexão e tente novamente.'
    );
  });

  it('erro que não é do axios vira mensagem genérica', () => {
    expect(mensagemErro(new Error('boom'), 'padrão')).toBe(
      'Ocorreu um erro inesperado.'
    );
    expect(mensagemErro(undefined, 'padrão')).toBe(
      'Ocorreu um erro inesperado.'
    );
  });
});
