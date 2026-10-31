import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ComponentProps, ReactElement } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Avatar, iniciais } from '@/components/ui/Avatar';
import { BarraAbas } from '@/components/ui/BarraAbas';
import { BlocoEstatistica } from '@/components/ui/BlocoEstatistica';
import { Botao, estiloVariante } from '@/components/ui/Botao';
import { CabecalhoDetalhe } from '@/components/ui/CabecalhoDetalhe';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { CampoTexto, corBordaCampo } from '@/components/ui/CampoTexto';
import { Cartao } from '@/components/ui/Cartao';
import { Chip } from '@/components/ui/Chip';
import { EstadoErro } from '@/components/ui/EstadoErro';
import { EstadoVazio } from '@/components/ui/EstadoVazio';
import { HeroGradiente } from '@/components/ui/HeroGradiente';
import { LinhaLista } from '@/components/ui/LinhaLista';
import { Pressionavel } from '@/components/ui/Pressionavel';
import { Selo } from '@/components/ui/Selo';
import { Skeleton, SkeletonLista } from '@/components/ui/Skeleton';
import { Tela } from '@/components/ui/Tela';
import { TituloSecao } from '@/components/ui/TituloSecao';
import { cores } from '@/theme';

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

describe('Botao', () => {
  it('chama onPress e dispara haptics', async () => {
    const aoPressionar = jest.fn();
    await render(<Botao onPress={aoPressionar}>ENTRAR</Botao>);

    await fireEvent.press(screen.getByText('ENTRAR'));

    expect(aoPressionar).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('não dispara quando carregando ou desabilitado', async () => {
    const aoPressionar = jest.fn();
    await render(
      <>
        <Botao onPress={aoPressionar} carregando testID="a">
          A
        </Botao>
        <Botao onPress={aoPressionar} disabled>
          B
        </Botao>
      </>
    );

    await fireEvent.press(screen.getByTestId('a'));
    await fireEvent.press(screen.getByText('B'));

    expect(aoPressionar).not.toHaveBeenCalled();
    expect(screen.queryByText('A')).toBeNull();
  });

  it('tem as cores de cada variante', () => {
    expect(estiloVariante('primario')).toMatchObject({ fundo: cores.primaria, texto: cores.sobrePrimaria });
    expect(estiloVariante('perigo')).toMatchObject({ texto: cores.perigo, borda: cores.perigo });
    expect(estiloVariante('fantasma').fundo).toBe('transparent');
    expect(estiloVariante('secundario').fundo).toBe(cores.superficieElevada);
  });
});

describe('CampoTexto', () => {
  it('escolhe a borda: erro > foco > padrão', () => {
    expect(corBordaCampo(false)).toBe(cores.borda);
    expect(corBordaCampo(true)).toBe(cores.primaria);
    expect(corBordaCampo(true, 'Inválido')).toBe(cores.perigo);
  });

  it('mostra rótulo e erro e repassa o texto digitado', async () => {
    const aoMudar = jest.fn();
    await render(<CampoTexto rotulo="E-mail" erro="E-mail inválido" placeholder="Digite" onChangeText={aoMudar} />);

    expect(screen.getByText('E-mail')).toBeTruthy();
    expect(screen.getByText('E-mail inválido')).toBeTruthy();

    await fireEvent.changeText(screen.getByPlaceholderText('Digite'), 'a@b.com');
    expect(aoMudar).toHaveBeenCalledWith('a@b.com');
  });

  it('alterna a visibilidade da senha', async () => {
    await render(<CampoTexto secureTextEntry placeholder="Senha" />);

    expect(screen.getByPlaceholderText('Senha').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByLabelText('Mostrar senha'));
    expect(screen.getByPlaceholderText('Senha').props.secureTextEntry).toBe(false);
  });
});

describe('Avatar', () => {
  it('extrai as iniciais ignorando partículas', () => {
    expect(iniciais('Maria da Silva')).toBe('MS');
    expect(iniciais('joão')).toBe('J');
    expect(iniciais('')).toBe('?');
    expect(iniciais(null)).toBe('?');
  });

  it('mostra as iniciais quando não há foto', async () => {
    await render(<Avatar nome="Ana Demo" />);
    expect(screen.getByText('AD')).toBeTruthy();
  });
});

describe('Pressionavel, Cartao, Chip, LinhaLista', () => {
  it('Pressionavel respeita haptico false e desabilitado', async () => {
    const aoPressionar = jest.fn();
    await render(
      <>
        <Pressionavel onPress={aoPressionar}>
          <Text>livre</Text>
        </Pressionavel>
        <Pressionavel onPress={aoPressionar} disabled>
          <Text>preso</Text>
        </Pressionavel>
      </>
    );

    await fireEvent.press(screen.getByText('livre'));
    await fireEvent.press(screen.getByText('preso'));

    expect(aoPressionar).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('Cartao só vira botão quando recebe onPress', async () => {
    const aoPressionar = jest.fn();
    await render(
      <>
        <Cartao testID="fixo">
          <Text>fixo</Text>
        </Cartao>
        <Cartao testID="toque" onPress={aoPressionar}>
          <Text>toque</Text>
        </Cartao>
      </>
    );

    await fireEvent.press(screen.getByText('toque'));
    expect(aoPressionar).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('toque').props.accessibilityRole).toBe('button');
    expect(screen.getByTestId('fixo').props.accessibilityRole).toBeUndefined();
  });

  it('Chip marca a seleção e responde ao toque', async () => {
    const aoPressionar = jest.fn();
    await render(<Chip rotulo="Peito" selecionado onPress={aoPressionar} />);

    await fireEvent.press(screen.getByText('Peito'));
    expect(aoPressionar).toHaveBeenCalledTimes(1);
  });

  it('LinhaLista mostra título/subtítulo e navega ao tocar', async () => {
    const aoPressionar = jest.fn();
    await render(<LinhaLista titulo="Ana Demo" subtitulo="11977776666" icone="person-outline" onPress={aoPressionar} />);

    expect(screen.getByText('11977776666')).toBeTruthy();
    await fireEvent.press(screen.getByText('Ana Demo'));
    expect(aoPressionar).toHaveBeenCalledTimes(1);
  });
});

describe('textos e estados', () => {
  it('BlocoEstatistica, Selo, TituloSecao e HeroGradiente renderizam o conteúdo', async () => {
    const aoAcionar = jest.fn();
    await render(
      <>
        <BlocoEstatistica valor={12} rotulo="Alunos" />
        <Selo rotulo="Vigente" tom="sucesso" />
        <TituloSecao titulo="Atalhos" acao={{ rotulo: 'Ver todos', onPress: aoAcionar }} />
        <HeroGradiente>
          <Text>Treino A</Text>
        </HeroGradiente>
        <CabecalhoGrande rotulo="SEXTA, 31 OUT" titulo="Olá, Ana" />
      </>
    );

    expect(screen.getByLabelText('Alunos: 12')).toBeTruthy();
    expect(screen.getByText('Vigente')).toBeTruthy();
    expect(screen.getByText('Treino A')).toBeTruthy();
    expect(screen.getByText('Olá, Ana')).toBeTruthy();
    expect(screen.getByText('SEXTA, 31 OUT')).toBeTruthy();

    await fireEvent.press(screen.getByText('Ver todos'));
    expect(aoAcionar).toHaveBeenCalledTimes(1);
  });

  it('EstadoVazio mostra a ação e EstadoErro permite tentar de novo', async () => {
    const aoAcionar = jest.fn();
    const aoTentar = jest.fn();
    await render(
      <>
        <EstadoVazio titulo="Nada por aqui" descricao="Crie o primeiro." acaoRotulo="Criar" aoAcionar={aoAcionar} />
        <EstadoErro mensagem="Falhou" aoTentarNovamente={aoTentar} />
      </>
    );

    await fireEvent.press(screen.getByText('Criar'));
    await fireEvent.press(screen.getByText('Tentar novamente'));

    expect(aoAcionar).toHaveBeenCalledTimes(1);
    expect(aoTentar).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Falhou')).toBeTruthy();
  });

  it('EstadoVazio sem ação não mostra botão', async () => {
    await render(<EstadoVazio titulo="Vazio" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('Skeleton e SkeletonLista renderizam', async () => {
    await render(
      <>
        <Skeleton />
        <SkeletonLista linhas={3} />
      </>
    );

    expect(screen.getByTestId('skeleton-lista')).toBeTruthy();
  });
});

describe('Tela e CabecalhoDetalhe', () => {
  it('Tela renderiza filhos e rodapé', async () => {
    await renderizar(
      <Tela rodape={<Text>rodape</Text>}>
        <Text>conteudo</Text>
      </Tela>
    );

    expect(screen.getByText('conteudo')).toBeTruthy();
    expect(screen.getByText('rodape')).toBeTruthy();
  });

  it('Tela sem rolagem também renderiza', async () => {
    await renderizar(
      <Tela rolavel={false}>
        <Text>fixa</Text>
      </Tela>
    );

    expect(screen.getByText('fixa')).toBeTruthy();
  });

  it('CabecalhoDetalhe volta com router.back e aceita aoVoltar próprio', async () => {
    await render(<CabecalhoDetalhe titulo="Ficha" />);

    await fireEvent.press(screen.getByTestId('botao-voltar'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('CabecalhoDetalhe sem histórico volta para a raiz', async () => {
    (router.canGoBack as jest.Mock).mockReturnValueOnce(false);
    await render(<CabecalhoDetalhe titulo="Ficha" />);

    await fireEvent.press(screen.getByTestId('botao-voltar'));
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('CabecalhoDetalhe usa aoVoltar quando informado', async () => {
    const aoVoltar = jest.fn();
    await render(<CabecalhoDetalhe titulo="Cadastro" aoVoltar={aoVoltar} />);

    await fireEvent.press(screen.getByTestId('botao-voltar'));
    expect(aoVoltar).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('BarraAbas', () => {
  const rotas = [
    { key: 'r1', name: 'painel', params: undefined },
    { key: 'r2', name: 'fichas', params: undefined },
    { key: 'r3', name: 'oculta', params: undefined },
  ];
  const abas = {
    painel: { rotulo: 'Início', icone: 'home-outline', iconeAtivo: 'home' },
    fichas: { rotulo: 'Fichas', icone: 'clipboard-outline', iconeAtivo: 'clipboard' },
  } as const;

  function montar(indice: number, defaultPrevented = false) {
    const navigation = {
      emit: jest.fn(() => ({ defaultPrevented })),
      navigate: jest.fn(),
    };
    // Só os campos que a barra usa.
    const props = { state: { index: indice, routes: rotas }, navigation } as unknown as Omit<
      ComponentProps<typeof BarraAbas>,
      'abas'
    >;

    return { navigation, props };
  }

  it('mostra só as abas definidas e marca a ativa', async () => {
    const { props } = montar(0);
    await renderizar(<BarraAbas {...props} abas={abas} />);

    expect(screen.getByText('Início')).toBeTruthy();
    expect(screen.getByText('Fichas')).toBeTruthy();
    expect(screen.queryByText('oculta')).toBeNull();
    expect(screen.getByTestId('aba-Início').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('aba-Fichas').props.accessibilityState.selected).toBe(false);
  });

  it('navega ao tocar numa aba inativa, com haptics', async () => {
    const { navigation, props } = montar(0);
    await renderizar(<BarraAbas {...props} abas={abas} />);

    await fireEvent.press(screen.getByTestId('aba-Fichas'));

    expect(navigation.emit).toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith('fichas', undefined);
    expect(Haptics.impactAsync).toHaveBeenCalled();
  });

  it('não navega ao tocar na aba já ativa', async () => {
    const { navigation, props } = montar(0);
    await renderizar(<BarraAbas {...props} abas={abas} />);

    await fireEvent.press(screen.getByTestId('aba-Início'));

    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('respeita preventDefault do evento tabPress', async () => {
    const { navigation, props } = montar(0, true);
    await renderizar(<BarraAbas {...props} abas={abas} />);

    await fireEvent.press(screen.getByTestId('aba-Fichas'));

    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
