import { Alert, Platform } from 'react-native';

import { mostrarAlerta, registrarExibidorAlerta } from '@/utils/alerta';

const alertaWeb = jest.fn();
const confirmaWeb = jest.fn();

function definirPlataforma(os: 'ios' | 'web') {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

beforeEach(() => {
  jest.restoreAllMocks();
  alertaWeb.mockReset();
  confirmaWeb.mockReset();
  (globalThis as any).window = { alert: alertaWeb, confirm: confirmaWeb };
});

afterAll(() => {
  delete (globalThis as any).window;
});

describe('mostrarAlerta no nativo', () => {
  it('delega para Alert.alert', () => {
    definirPlataforma('ios');
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const botoes = [{ text: 'OK' }];

    mostrarAlerta('Título', 'Msg', botoes);

    expect(spy).toHaveBeenCalledWith('Título', 'Msg', botoes);
    expect(alertaWeb).not.toHaveBeenCalled();
  });
});

describe('mostrarAlerta na web', () => {
  beforeEach(() => definirPlataforma('web'));

  it('sem botões usa window.alert', () => {
    mostrarAlerta('Erro', 'Falhou');

    expect(alertaWeb).toHaveBeenCalledWith('Erro\n\nFalhou');
  });

  it('com 1 botão mostra o alerta e executa o onPress', () => {
    const onPress = jest.fn();

    mostrarAlerta('Criado', undefined, [{ text: 'OK', onPress }]);

    expect(alertaWeb).toHaveBeenCalledWith('Criado');
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('com 2 botões e OK executa o primeiro que não é cancel', () => {
    confirmaWeb.mockReturnValue(true);
    const cancelar = jest.fn();
    const excluir = jest.fn();

    mostrarAlerta('Excluir', 'Certeza?', [
      { text: 'Cancelar', style: 'cancel', onPress: cancelar },
      { text: 'Excluir', style: 'destructive', onPress: excluir },
    ]);

    expect(excluir).toHaveBeenCalledTimes(1);
    expect(cancelar).not.toHaveBeenCalled();
  });

  it('com 2 botões e Cancelar executa o botão cancel', () => {
    confirmaWeb.mockReturnValue(false);
    const cancelar = jest.fn();
    const excluir = jest.fn();

    mostrarAlerta('Excluir', undefined, [
      { text: 'Cancelar', style: 'cancel', onPress: cancelar },
      { text: 'Excluir', onPress: excluir },
    ]);

    expect(cancelar).toHaveBeenCalledTimes(1);
    expect(excluir).not.toHaveBeenCalled();
  });

  it('Cancelar sem botão cancel não faz nada', () => {
    confirmaWeb.mockReturnValue(false);
    const a = jest.fn();

    mostrarAlerta('X', undefined, [
      { text: 'A', onPress: a },
      { text: 'B' },
    ]);

    expect(a).not.toHaveBeenCalled();
  });
});

describe('mostrarAlerta com exibidor registrado (modal do design system)', () => {
  it('envia título, mensagem e botões ao exibidor, igual em qualquer plataforma', () => {
    const exibidor = jest.fn();
    const desfazer = registrarExibidorAlerta(exibidor);
    const botoes = [{ text: 'OK' }];
    const nativo = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    for (const os of ['ios', 'web'] as const) {
      definirPlataforma(os);
      mostrarAlerta('Título', 'Msg', botoes);
    }

    expect(exibidor).toHaveBeenCalledTimes(2);
    expect(exibidor).toHaveBeenCalledWith({ titulo: 'Título', mensagem: 'Msg', botoes });
    expect(nativo).not.toHaveBeenCalled();
    expect(alertaWeb).not.toHaveBeenCalled();

    desfazer();
  });

  it('desfazer o registro volta ao fallback', () => {
    definirPlataforma('ios');
    const exibidor = jest.fn();
    const nativo = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    registrarExibidorAlerta(exibidor)();
    mostrarAlerta('X');

    expect(exibidor).not.toHaveBeenCalled();
    expect(nativo).toHaveBeenCalledTimes(1);
  });

  it('desfazer um registro antigo não remove o exibidor mais novo', () => {
    const antigo = jest.fn();
    const novo = jest.fn();
    const desfazerAntigo = registrarExibidorAlerta(antigo);
    const desfazerNovo = registrarExibidorAlerta(novo);

    desfazerAntigo();
    mostrarAlerta('Y');

    expect(novo).toHaveBeenCalledTimes(1);

    desfazerNovo();
  });
});
