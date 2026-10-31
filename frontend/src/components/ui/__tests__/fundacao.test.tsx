import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ReactElement } from 'react';
import { Alert, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { Chip } from '@/components/ui/Chip';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoErroSecao } from '@/components/ui/EstadoErroSecao';
import { botoesEmLinha } from '@/components/ui/DialogoAlerta';
import { Tela } from '@/components/ui/Tela';
import { TelaLista, TelaSecoes } from '@/components/ui/TelaLista';
import { ContextoAutenticacao } from '@/contexts/AuthContext';
import { ProvedorAlerta } from '@/contexts/AlertaContext';
import { mostrarAlerta } from '@/utils/alerta';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));

const METRICAS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 24, left: 0, right: 0, bottom: 16 },
};

async function renderizar(elemento: ReactElement) {
  return render(<SafeAreaProvider initialMetrics={METRICAS}>{elemento}</SafeAreaProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProvedorAlerta / DialogoAlerta (P-01)', () => {
  async function montar() {
    return renderizar(
      <ProvedorAlerta>
        <Text>app</Text>
      </ProvedorAlerta>
    );
  }

  it('mostrarAlerta abre o modal do design system em vez do Alert.alert', async () => {
    const nativo = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await montar();

    await act(async () => mostrarAlerta('Excluir ficha', 'Esta ação não pode ser desfeita.'));

    expect(screen.getByTestId('dialogo-alerta')).toBeTruthy();
    expect(screen.getByText('Excluir ficha')).toBeTruthy();
    expect(screen.getByText('Esta ação não pode ser desfeita.')).toBeTruthy();
    expect(nativo).not.toHaveBeenCalled();
  });

  it('sem botões mostra "OK" e fecha ao tocar', async () => {
    await montar();

    await act(async () => mostrarAlerta('Aviso'));
    await fireEvent.press(screen.getByText('OK'));

    expect(screen.queryByText('Aviso')).toBeNull();
  });

  it('executa o onPress do botão escolhido e fecha; o cancelar não executa o outro', async () => {
    const excluir = jest.fn();
    const cancelar = jest.fn();
    await montar();

    await act(async () =>
      mostrarAlerta('Excluir', 'Certeza?', [
        { text: 'Cancelar', style: 'cancel', onPress: cancelar },
        { text: 'Excluir', style: 'destructive', onPress: excluir },
      ])
    );
    await fireEvent.press(screen.getByTestId('alerta-botao-destructive-1'));

    expect(excluir).toHaveBeenCalledTimes(1);
    expect(cancelar).not.toHaveBeenCalled();
    expect(screen.queryByText('Certeza?')).toBeNull();
  });

  it('o botão cancelar executa só o onPress do cancelar', async () => {
    const excluir = jest.fn();
    const cancelar = jest.fn();
    await montar();

    await act(async () =>
      mostrarAlerta('Excluir', undefined, [
        { text: 'Voltar', style: 'cancel', onPress: cancelar },
        { text: 'Apagar', style: 'destructive', onPress: excluir },
      ])
    );
    await fireEvent.press(screen.getByText('Voltar'));

    expect(cancelar).toHaveBeenCalledTimes(1);
    expect(excluir).not.toHaveBeenCalled();
  });

  it('alertas simultâneos entram numa fila e aparecem um por vez', async () => {
    await montar();

    await act(async () => {
      mostrarAlerta('Primeiro');
      mostrarAlerta('Segundo');
    });

    expect(screen.getByText('Primeiro')).toBeTruthy();
    expect(screen.queryByText('Segundo')).toBeNull();

    await fireEvent.press(screen.getByText('OK'));

    expect(screen.getByText('Segundo')).toBeTruthy();
  });

  it('o onPress pode abrir outro alerta (encadeamento)', async () => {
    await montar();

    await act(async () =>
      mostrarAlerta('Um', undefined, [
        { text: 'Seguir', onPress: () => mostrarAlerta('Dois') },
      ])
    );
    await fireEvent.press(screen.getByText('Seguir'));

    expect(screen.getByText('Dois')).toBeTruthy();
  });

  it('com 3 botões lista todos, na ordem', async () => {
    await montar();

    await act(async () =>
      mostrarAlerta('Escolha', undefined, [{ text: 'A' }, { text: 'B' }, { text: 'C', style: 'cancel' }])
    );

    expect(screen.getByTestId('alerta-botao-default-0')).toBeTruthy();
    expect(screen.getByTestId('alerta-botao-default-1')).toBeTruthy();
    expect(screen.getByTestId('alerta-botao-cancel-2')).toBeTruthy();
  });

  it('ao desmontar o provedor, volta ao fallback do sistema', async () => {
    const nativo = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { unmount } = await montar();

    await unmount();
    mostrarAlerta('Fallback', 'msg');

    expect(nativo).toHaveBeenCalledWith('Fallback', 'msg', undefined);
  });
});

describe('EstadoErro e EstadoErroSecao (I-05)', () => {
  it('EstadoErro: mensagem, ícone de alerta por padrão, botão centralizado', async () => {
    const aoTentar = jest.fn();
    await render(<EstadoErro mensagem="Ficha não encontrada" aoTentarNovamente={aoTentar} />);

    expect(screen.getByText('Ficha não encontrada')).toBeTruthy();
    expect(screen.getByTestId('estado-erro')).toBeTruthy();
    await fireEvent.press(screen.getByText('Tentar novamente'));
    expect(aoTentar).toHaveBeenCalledTimes(1);
  });

  it('EstadoErro: o botão tem alignSelf center', async () => {
    await render(<EstadoErro aoTentarNovamente={() => {}} />);

    const estilo = screen.getByText('Tentar novamente').parent?.parent?.props.style;
    const achatado = Array.isArray(estilo) ? Object.assign({}, ...estilo.flat(Infinity).filter(Boolean)) : estilo;

    expect(JSON.stringify(achatado ?? {})).toContain('center');
  });

  it('EstadoErroSecao: mensagem compacta e "Tentar novamente"', async () => {
    const aoTentar = jest.fn();
    await render(<EstadoErroSecao mensagem="Erro ao carregar sessões." aoTentarNovamente={aoTentar} />);

    expect(screen.getByTestId('estado-erro-secao')).toBeTruthy();
    expect(screen.getByText('Erro ao carregar sessões.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Tentar novamente'));
    expect(aoTentar).toHaveBeenCalledTimes(1);
  });

  it('EstadoErroSecao sem ação não mostra o botão', async () => {
    await render(<EstadoErroSecao mensagem="Falhou" />);

    expect(screen.queryByText('Tentar novamente')).toBeNull();
  });
});

describe('Tela: respiro e véu na status bar (P-08, P-11)', () => {
  it('Tela mostra o véu sobre a safe area superior', async () => {
    await renderizar(
      <Tela>
        <Text>conteudo</Text>
      </Tela>
    );

    const veu = screen.getByTestId('veu-status-bar');

    expect(JSON.stringify(veu.props.style)).toContain('"height":24');
  });

  it('sem safe area superior não há véu', async () => {
    await render(
      <SafeAreaProvider initialMetrics={{ ...METRICAS, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
        <Tela>
          <Text>conteudo</Text>
        </Tela>
      </SafeAreaProvider>
    );

    expect(screen.queryByTestId('veu-status-bar')).toBeNull();
  });

  it('CabecalhoDetalhe reserva espaço (≥16) abaixo de si', async () => {
    await render(<CabecalhoDetalhe titulo="Ficha" />);

    const linha = screen.getByTestId('botao-voltar').parent;

    expect(JSON.stringify(linha?.props.style)).toContain('"marginBottom":16');
  });
});

describe('CabecalhoDetalhe: fallback do voltar por perfil (S-4)', () => {
  function comPerfil(tipo: 'professor' | 'aluno' | 'admin' | null) {
    return (
      <ContextoAutenticacao.Provider
        value={{ usuario: tipo ? ({ tipo } as never) : null } as never}
      >
        <CabecalhoDetalhe titulo="X" />
      </ContextoAutenticacao.Provider>
    );
  }

  beforeEach(() => {
    (router.canGoBack as jest.Mock).mockReturnValue(false);
  });

  afterAll(() => {
    (router.canGoBack as jest.Mock).mockReturnValue(true);
  });

  it.each([
    ['professor', '/painel'],
    ['aluno', '/aluno'],
    ['admin', '/aluno'],
  ] as const)('%s sem histórico vai para %s', async (tipo, rota) => {
    await render(comPerfil(tipo));

    await fireEvent.press(screen.getByTestId('botao-voltar'));

    expect(router.replace).toHaveBeenCalledWith(rota);
  });

  it('sem usuário vai para a raiz', async () => {
    await render(comPerfil(null));

    await fireEvent.press(screen.getByTestId('botao-voltar'));

    expect(router.replace).toHaveBeenCalledWith('/');
  });
});

describe('Chip: área de toque (S-3)', () => {
  it('amplia a área vertical com hitSlop (34 + 10 = 44)', async () => {
    await render(<Chip rotulo="Peito" onPress={() => {}} testID="chip" />);

    expect(screen.getByTestId('chip').props.hitSlop).toEqual({ top: 5, bottom: 5 });
  });
});

describe('TelaLista e TelaSecoes (I-1)', () => {
  it('TelaLista renderiza cabeçalho, itens e rodapé; vazio só sem itens', async () => {
    await renderizar(
      <TelaLista
        dados={[{ id: 1, nome: 'A' }, { id: 2, nome: 'B' }]}
        chave={(i) => String(i.id)}
        cabecalho={<Text>cabecalho</Text>}
        vazio={<Text>vazio</Text>}
        rodape={<Text>rodape</Text>}
        renderItem={({ item }) => <Text>{item.nome}</Text>}
      />
    );

    expect(screen.getByText('cabecalho')).toBeTruthy();
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('B')).toBeTruthy();
    expect(screen.getByText('rodape')).toBeTruthy();
    expect(screen.queryByText('vazio')).toBeNull();
    expect(screen.getByTestId('veu-status-bar')).toBeTruthy();
  });

  it('TelaLista sem dados mostra o vazio', async () => {
    await renderizar(
      <TelaLista
        dados={[] as { id: number }[]}
        chave={(i) => String(i.id)}
        cabecalho={<Text>cabecalho</Text>}
        vazio={<Text>vazio</Text>}
        renderItem={() => <Text>item</Text>}
      />
    );

    expect(screen.getByText('vazio')).toBeTruthy();
    expect(screen.queryByText('item')).toBeNull();
  });

  it('TelaSecoes renderiza os títulos das seções e seus itens', async () => {
    await renderizar(
      <TelaSecoes<{ id: number }, { titulo: string }>
        secoes={[
          { titulo: 'Outubro 2026', data: [{ id: 1 }] },
          { titulo: 'Setembro 2026', data: [{ id: 2 }] },
        ]}
        chave={(i) => String(i.id)}
        renderSecao={({ section }) => <Text>{section.titulo}</Text>}
        renderItem={({ item }) => <Text>{`sessao ${item.id}`}</Text>}
      />
    );

    expect(screen.getByText('Outubro 2026')).toBeTruthy();
    expect(screen.getByText('Setembro 2026')).toBeTruthy();
    expect(screen.getByText('sessao 1')).toBeTruthy();
    expect(screen.getByText('sessao 2')).toBeTruthy();
  });
});

describe('botoesEmLinha (P-I)', () => {
  it('2 botões curtos ficam lado a lado; rótulo longo ou 3+ botões empilham', () => {
    expect(botoesEmLinha([{ text: 'Continuar', style: 'cancel' }, { text: 'Sair' }])).toBe(true);
    expect(
      botoesEmLinha([{ text: 'Continuar treinando', style: 'cancel' }, { text: 'Sair' }])
    ).toBe(false);
    expect(botoesEmLinha([{ text: 'A' }, { text: 'B' }, { text: 'C' }])).toBe(false);
  });
});
