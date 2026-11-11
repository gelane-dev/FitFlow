import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Cadastro from '@/app/(publico)/cadastro';
import { cadastro } from '@/services/auth.service';
import { mostrarAlerta } from '@/utils/alerta';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('@/services/auth.service', () => ({ cadastro: jest.fn() }));
jest.mock('@/utils/alerta', () => ({ mostrarAlerta: jest.fn() }));

const cadastroMock = cadastro as jest.Mock;

const METRICAS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 24, left: 0, right: 0, bottom: 16 },
};

async function preencherEEnviar() {
  await render(
    <SafeAreaProvider initialMetrics={METRICAS}>
      <Cadastro />
    </SafeAreaProvider>,
  );

  await fireEvent.changeText(screen.getByPlaceholderText('Digite seu nome'), 'Aluno Novo');
  await fireEvent.changeText(screen.getByPlaceholderText('Digite seu e-mail'), 'novo@x.com');
  await fireEvent.changeText(screen.getByPlaceholderText('Digite seu telefone'), '11999990000');
  await fireEvent.changeText(screen.getByPlaceholderText('DD/MM/AAAA'), '01012000');
  await fireEvent.changeText(screen.getByPlaceholderText('Digite sua senha'), 'Senha@123');
  await fireEvent.changeText(screen.getByPlaceholderText('Confirme sua senha'), 'Senha@123');
  await fireEvent.press(screen.getByText('CADASTRAR'));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('cadastro de aluno (nasce pendente)', () => {
  it('depois do POST /cadastro avisa da aprovação e volta ao login, sem tentar entrar', async () => {
    cadastroMock.mockResolvedValue({ id: 1, email: 'novo@x.com' });

    await preencherEEnviar();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));

    expect(cadastroMock).toHaveBeenCalledTimes(1);
    expect(cadastroMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'novo@x.com', data_nascimento: '2000-01-01' }),
    );
    expect(mostrarAlerta).toHaveBeenCalledWith('Cadastro enviado', 'Aguarde a aprovação da recepção.');
  });

  it('se o servidor recusar, fica na tela e mostra o erro (não volta ao login)', async () => {
    const { AxiosError } = jest.requireActual('axios');
    cadastroMock.mockRejectedValue(
      new AxiosError('x', 'ERR_BAD_REQUEST', undefined, null, {
        status: 400,
        data: { detail: 'E-mail já cadastrado' },
        statusText: '',
        headers: {},
        config: {},
      }),
    );

    await preencherEEnviar();

    await waitFor(() => expect(mostrarAlerta).toHaveBeenCalledWith('Erro', 'E-mail já cadastrado'));

    expect(router.replace).not.toHaveBeenCalled();
  });
});
