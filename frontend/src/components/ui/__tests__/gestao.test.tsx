import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { ComponentProps, ReactElement } from 'react';
import { Dimensions, Platform, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BarraAbas } from '@/components/ui/BarraAbas';
import { BarraFiltros, ESPERA_BUSCA_MS } from '@/components/ui/BarraFiltros';
import { CampoData } from '@/components/ui/CampoData';
import { CampoMoeda } from '@/components/ui/CampoMoeda';
import { CampoSelecao } from '@/components/ui/CampoSelecao';
import { GraficoBarras } from '@/components/ui/GraficoBarras';
import { Botao } from '@/components/ui/Botao';
import { Indicador, tamanhoFonteValor } from '@/components/ui/Indicador';
import { Paginacao } from '@/components/ui/Paginacao';
import { SeloSituacao } from '@/components/ui/SeloSituacao';
import { ColunaTabela, larguraMinimaColuna, TabelaDados } from '@/components/ui/TabelaDados';
import { useLarguraTela } from '@/components/ui/useLarguraTela';
import { ContextoAutenticacao } from '@/contexts/AuthContext';
import { ProvedorAlerta } from '@/contexts/AlertaContext';
import { classificarLargura } from '@/utils/larguraTela';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));

// Largura controlada pelo teste (o hook real é testado à parte, com Dimensions).
let mockLargura = 390;

jest.mock('@/components/ui/useLarguraTela', () => {
  const real = jest.requireActual('@/components/ui/useLarguraTela');
  const { classificarLargura: classificar } = jest.requireActual('@/utils/larguraTela');

  return {
    ...real,
    useLarguraTela: jest.fn(() => classificar(mockLargura)),
    __esReal: real.useLarguraTela,
  };
});

const METRICAS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 24, left: 0, right: 0, bottom: 16 },
};

async function renderizar(elemento: ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={METRICAS}>
      <ProvedorAlerta>{elemento}</ProvedorAlerta>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLargura = 390;
});

describe('useLarguraTela', () => {
  it('classifica a largura da janela e reage ao redimensionamento', async () => {
    const real = (jest.requireMock('@/components/ui/useLarguraTela') as { __esReal: typeof useLarguraTela }).__esReal;
    const original = Dimensions.get('window');

    Dimensions.set({ window: { ...original, width: 1280 } });
    const { result } = await renderHook(() => real());

    expect(result.current).toEqual(classificarLargura(1280));
    expect(result.current.ehLargo).toBe(true);

    await act(async () => {
      Dimensions.set({ window: { ...original, width: 800 } });
    });

    expect(result.current).toMatchObject({ largura: 800, ehMedio: true, ehLargo: false });

    await act(async () => {
      Dimensions.set({ window: original });
    });
  });
});

interface Aluno {
  id: number;
  nome: string;
  plano: string;
}

const ALUNOS: Aluno[] = [
  { id: 1, nome: 'Carla', plano: 'Mensal' },
  { id: 2, nome: 'Ana', plano: 'Anual' },
  { id: 3, nome: 'Bruno', plano: 'Mensal' },
];

const COLUNAS: ColunaTabela<Aluno>[] = [
  { chave: 'nome', titulo: 'Nome', render: (a) => a.nome, principal: true, ordenavel: true, valorOrdenacao: (a) => a.nome },
  { chave: 'plano', titulo: 'Plano', render: (a) => a.plano },
];

describe('TabelaDados', () => {
  function nomesNaOrdem() {
    return screen.getAllByText(/^(Ana|Bruno|Carla)$/).map((n) => n.props.children);
  }

  it('no celular renderiza cartões empilhados, sem cabeçalho de tabela', async () => {
    mockLargura = 390;
    await renderizar(<TabelaDados colunas={COLUNAS} dados={ALUNOS} chaveItem={(a) => a.id} testID="alunos" />);

    expect(screen.getByTestId('alunos-cartao-1')).toBeTruthy();
    expect(screen.queryByTestId('alunos-linha-1')).toBeNull();
    expect(screen.queryByTestId('tabela-ordenar-nome')).toBeNull();
    expect(screen.getAllByText('Plano')).toHaveLength(3); // rótulo de campo em cada cartão
  });

  it('no celular a coluna de ações vai para o rodapé do cartão, sem o rótulo "Ações"', async () => {
    mockLargura = 390;
    const colunas: ColunaTabela<Aluno>[] = [
      ...COLUNAS,
      { chave: 'acoes', titulo: 'Ações', acoes: true, render: (a) => `Renovar ${a.nome}` },
    ];
    await renderizar(<TabelaDados colunas={colunas} dados={ALUNOS} chaveItem={(a) => a.id} testID="alunos" />);

    expect(screen.queryByText('Ações')).toBeNull();
    expect(screen.getByTestId('alunos-acoes-1')).toBeTruthy();
    expect(screen.getByText('Renovar Carla')).toBeTruthy();
    expect(screen.getAllByText('Plano')).toHaveLength(3); // as demais colunas mantêm o rótulo
  });

  it('na tabela (médio) a coluna de ações mantém o cabeçalho', async () => {
    mockLargura = 800;
    const colunas: ColunaTabela<Aluno>[] = [
      ...COLUNAS,
      { chave: 'acoes', titulo: 'Ações', acoes: true, render: (a) => `Renovar ${a.nome}` },
    ];
    await renderizar(<TabelaDados colunas={colunas} dados={ALUNOS} chaveItem={(a) => a.id} testID="alunos" />);

    expect(screen.getByText('Ações')).toBeTruthy();
  });

  it('no médio renderiza tabela com cabeçalho e uma linha por item', async () => {
    mockLargura = 800;
    await renderizar(<TabelaDados colunas={COLUNAS} dados={ALUNOS} chaveItem={(a) => a.id} testID="alunos" />);

    expect(screen.getByTestId('alunos-linha-1')).toBeTruthy();
    expect(screen.queryByTestId('alunos-cartao-1')).toBeNull();
    expect(screen.getAllByText('Plano')).toHaveLength(1); // só no cabeçalho
    expect(screen.getByTestId('tabela-ordenar-nome')).toBeTruthy();
  });

  it('ordena ao tocar no cabeçalho (asc, depois desc)', async () => {
    mockLargura = 800;
    await renderizar(<TabelaDados colunas={COLUNAS} dados={ALUNOS} chaveItem={(a) => a.id} />);

    expect(nomesNaOrdem()).toEqual(['Carla', 'Ana', 'Bruno']);

    await fireEvent.press(screen.getByTestId('tabela-ordenar-nome'));
    expect(nomesNaOrdem()).toEqual(['Ana', 'Bruno', 'Carla']);

    await fireEvent.press(screen.getByTestId('tabela-ordenar-nome'));
    expect(nomesNaOrdem()).toEqual(['Carla', 'Bruno', 'Ana']);
  });

  it('linha clicável chama aoPressionar com o item', async () => {
    mockLargura = 800;
    const aoPressionar = jest.fn();
    await renderizar(
      <TabelaDados colunas={COLUNAS} dados={ALUNOS} chaveItem={(a) => a.id} aoPressionar={aoPressionar} testID="t" />,
    );

    await fireEvent.press(screen.getByTestId('t-linha-2'));

    expect(aoPressionar).toHaveBeenCalledWith(ALUNOS[1]);
  });

  it('estado vazio mostra a mensagem informada', async () => {
    await renderizar(
      <TabelaDados
        colunas={COLUNAS}
        dados={[]}
        chaveItem={(a) => a.id}
        vazio={{ titulo: 'Nenhum aluno encontrado', descricao: 'Ajuste a busca.' }}
      />,
    );

    expect(screen.getByText('Nenhum aluno encontrado')).toBeTruthy();
    expect(screen.getByText('Ajuste a busca.')).toBeTruthy();
  });

  it('erro mostra a mensagem e tenta de novo; carregando mostra o esqueleto', async () => {
    const tentar = jest.fn();
    const { rerender } = await renderizar(
      <TabelaDados colunas={COLUNAS} dados={ALUNOS} chaveItem={(a) => a.id} erro="Falhou" aoTentarNovamente={tentar} />,
    );

    expect(screen.getByText('Falhou')).toBeTruthy();

    await rerender(
      <SafeAreaProvider initialMetrics={METRICAS}>
        <ProvedorAlerta>
          <TabelaDados colunas={COLUNAS} dados={ALUNOS} chaveItem={(a) => a.id} carregando />
        </ProvedorAlerta>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId('skeleton-lista')).toBeTruthy();
  });
});

describe('BarraFiltros', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('espera 300 ms depois da última tecla e avisa uma vez só', async () => {
    const aoBuscar = jest.fn();
    await renderizar(<BarraFiltros aoBuscar={aoBuscar} />);

    await fireEvent.changeText(screen.getByTestId('filtro-busca'), 'a');
    await act(async () => jest.advanceTimersByTime(200));
    await fireEvent.changeText(screen.getByTestId('filtro-busca'), 'ana');
    await act(async () => jest.advanceTimersByTime(ESPERA_BUSCA_MS - 1));

    expect(aoBuscar).not.toHaveBeenCalled();

    await act(async () => jest.advanceTimersByTime(1));

    expect(aoBuscar).toHaveBeenCalledTimes(1);
    expect(aoBuscar).toHaveBeenCalledWith('ana');
  });

  it('não avisa na montagem e limpar a busca avisa o texto vazio', async () => {
    const aoBuscar = jest.fn();
    await renderizar(<BarraFiltros aoBuscar={aoBuscar} buscaInicial="x" />);
    await act(async () => jest.advanceTimersByTime(1000));

    expect(aoBuscar).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('filtro-limpar'));
    await act(async () => jest.advanceTimersByTime(ESPERA_BUSCA_MS));

    expect(aoBuscar).toHaveBeenCalledWith('');
  });

  it('chips: escolhe e desmarca o ativo', async () => {
    const aoMudarChip = jest.fn();
    const chips = [
      { valor: 'vigente', rotulo: 'Vigentes' },
      { valor: 'vencida', rotulo: 'Vencidas' },
    ];
    const { rerender } = await renderizar(
      <BarraFiltros aoBuscar={jest.fn()} chips={chips} chipAtivo={null} aoMudarChip={aoMudarChip} />,
    );

    await fireEvent.press(screen.getByText('Vigentes'));
    expect(aoMudarChip).toHaveBeenLastCalledWith('vigente');

    await rerender(
      <SafeAreaProvider initialMetrics={METRICAS}>
        <ProvedorAlerta>
          <BarraFiltros aoBuscar={jest.fn()} chips={chips} chipAtivo="vigente" aoMudarChip={aoMudarChip} />
        </ProvedorAlerta>
      </SafeAreaProvider>,
    );
    await fireEvent.press(screen.getByText('Vigentes'));

    expect(aoMudarChip).toHaveBeenLastCalledWith(null);
  });
});

describe('Paginacao', () => {
  it('mostra o intervalo e navega para a página vizinha', async () => {
    const aoMudar = jest.fn();
    await renderizar(<Paginacao total={135} tamanhoPagina={20} pagina={2} aoMudarPagina={aoMudar} />);

    expect(screen.getByText('21–40 de 135')).toBeTruthy();
    expect(screen.getByText('Página 2 de 7')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('paginacao-proxima'));
    await fireEvent.press(screen.getByTestId('paginacao-anterior'));

    expect(aoMudar).toHaveBeenNthCalledWith(1, 3);
    expect(aoMudar).toHaveBeenNthCalledWith(2, 1);
  });

  it('desabilita Anterior na primeira página e Próxima na última', async () => {
    const aoMudar = jest.fn();
    const { rerender } = await renderizar(<Paginacao total={30} tamanhoPagina={20} pagina={1} aoMudarPagina={aoMudar} />);

    await fireEvent.press(screen.getByTestId('paginacao-anterior'));
    expect(aoMudar).not.toHaveBeenCalled();

    await rerender(
      <SafeAreaProvider initialMetrics={METRICAS}>
        <ProvedorAlerta>
          <Paginacao total={30} tamanhoPagina={20} pagina={2} aoMudarPagina={aoMudar} />
        </ProvedorAlerta>
      </SafeAreaProvider>,
    );
    await fireEvent.press(screen.getByTestId('paginacao-proxima'));

    expect(aoMudar).not.toHaveBeenCalled();
  });

  it('não aparece sem itens', async () => {
    await renderizar(<Paginacao total={0} tamanhoPagina={20} pagina={1} aoMudarPagina={jest.fn()} testID="pag" />);

    expect(screen.queryByTestId('pag')).toBeNull();
  });
});

describe('fonte dos textos de SVG (QA-GA-05)', () => {
  it('na web os gráficos usam a pilha sans do sistema, nunca a serifada padrão do SVG', () => {
    const { fonteCorpoPara } = jest.requireActual('@/theme');

    expect(fonteCorpoPara('web')).toMatch(/system-ui.*sans-serif$/);
    expect(fonteCorpoPara('ios')).toBeUndefined();
  });
});

describe('GraficoBarras', () => {
  const dados = [
    { rotulo: 'Jan', valor: 1200 },
    { rotulo: 'Fev', valor: 900 },
  ];

  it('expõe um resumo acessível com rótulos e valores', async () => {
    await renderizar(<GraficoBarras dados={dados} rotulo="Receita por mês" testID="grafico" />);

    expect(screen.getByTestId('grafico').props.accessibilityLabel).toBe('Receita por mês: Jan 1200, Fev 900');
    expect(screen.getByTestId('grafico').props.accessibilityRole).toBe('image');
  });

  it('com muitas barras todas ficam acessíveis, mas o eixo mostra um rótulo a cada N', async () => {
    const muitas = Array.from({ length: 13 }, (_, i) => ({ rotulo: `${String(i + 1).padStart(2, '0')}/01`, valor: i + 1 }));
    await renderizar(<GraficoBarras dados={muitas} rotulo="Frequência" testID="grafico" />);

    const rotulo = screen.getByTestId('grafico').props.accessibilityLabel as string;
    expect(rotulo).toContain('01/01 1');
    expect(rotulo).toContain('13/01 13');
    // largura padrão 320 → faixa ~23 px, rótulo de 5 caracteres pede passo 2: 7 de 13 rótulos
    // o texto SVG não é um Text do RN: conta no JSON renderizado (rótulo do eixo = filho `NN/01`)
    const rotulosEixo = JSON.stringify(screen.toJSON()).match(/"\d\d\/01"/g) ?? [];
    expect(rotulosEixo).toHaveLength(7);
  });

  it('horizontal e valores formatados pelo chamador', async () => {
    await renderizar(
      <GraficoBarras
        dados={dados}
        rotulo="Receita"
        orientacao="horizontal"
        formatarValor={(v) => `R$ ${v}`}
        testID="grafico"
      />,
    );

    expect(screen.getByTestId('grafico').props.accessibilityLabel).toBe('Receita: Jan R$ 1200, Fev R$ 900');
  });

  it('sem dados mostra o estado vazio', async () => {
    await renderizar(<GraficoBarras dados={[]} rotulo="Receita" mensagemVazio="Sem receita no período." testID="grafico" />);

    expect(screen.getByText('Sem receita no período.')).toBeTruthy();
    expect(screen.getByTestId('grafico').props.accessibilityLabel).toBe('Receita: sem dados');
  });
});

describe('SeloSituacao', () => {
  it.each([
    ['vigente', 'Vigente'],
    ['vencendo', 'Vencendo'],
    ['vencida', 'Vencida'],
    ['pendente', 'Pendente'],
    ['desativado', 'Desativado'],
    ['liberado', 'Liberado'],
    ['bloqueado', 'Bloqueado'],
  ])('%s mostra o texto "%s" (cor nunca sozinha)', async (situacao, texto) => {
    await renderizar(<SeloSituacao situacao={situacao} testID="selo" />);

    expect(screen.getByText(texto)).toBeTruthy();
    expect(screen.getByTestId('selo').props.accessibilityLabel).toBe(`Situação: ${texto}`);
  });

  it('situação desconhecida aparece como veio e o rótulo pode ser trocado', async () => {
    await renderizar(
      <>
        <SeloSituacao situacao="outra" />
        <SeloSituacao situacao="vencendo" rotulo="Vence em 3 dias" />
      </>,
    );

    expect(screen.getByText('outra')).toBeTruthy();
    expect(screen.getByText('Vence em 3 dias')).toBeTruthy();
  });
});

describe('SeloSituacao (GB-10)', () => {
  it('o texto nunca fica menor que 12 (GB-10)', async () => {
    await renderizar(<SeloSituacao situacao="vigente" />);

    const estilo = StyleSheet.flatten(screen.getByText('Vigente').props.style);

    expect(estilo.fontSize).toBeGreaterThanOrEqual(12);
  });
});

describe('CampoData (GB-10)', () => {
  it('expõe rótulo e dica de formato para leitores de tela', async () => {
    await renderizar(<CampoData rotulo="Nascimento" value="" onChangeData={jest.fn()} />);

    const campo = screen.getByLabelText('Nascimento');

    expect(campo.props.accessibilityHint).toContain('DD/MM/AAAA');
  });
});

describe('Indicador', () => {
  it('mostra rótulo, valor e variação com seta e texto', async () => {
    await renderizar(
      <Indicador
        rotulo="Alunos ativos"
        valor="87"
        variacao={{ texto: '+5 no mês', tendencia: 'alta', favoravel: true }}
        testID="kpi"
      />,
    );

    expect(screen.getByText('Alunos ativos')).toBeTruthy();
    expect(screen.getByText('87')).toBeTruthy();
    expect(screen.getByText('+5 no mês')).toBeTruthy();
  });
});

describe('Indicador: valor em R$ inteiro (QA-GA-01)', () => {
  it('reduz a fonte conforme o valor cresce e nunca usa reticências', async () => {
    expect(tamanhoFonteValor('87')).toBeGreaterThan(tamanhoFonteValor('R$ 339,90'));
    expect(tamanhoFonteValor('R$ 339,90')).toBeGreaterThan(tamanhoFonteValor('R$ 12.339,90'));
    expect(tamanhoFonteValor('R$ 12.339,90')).toBeGreaterThan(tamanhoFonteValor('R$ 1.234.567,89'));

    await renderizar(<Indicador rotulo="Recebido" valor="R$ 339,90" testID="kpi-moeda" />);

    const valor = screen.getByTestId('kpi-moeda-valor');
    expect(valor.props.numberOfLines).toBeUndefined();
    expect(valor.props.ellipsizeMode).toBeUndefined();
  });

  it('valores de milhar cabem no cartão de meia largura a 390 px (135 px úteis, medidos no Chromium)', () => {
    // largura em "em" medida no navegador (peso 800, algarismos tabulares); o tamanho escolhido deixa folga
    const larguraEmUtil = 135 - 8;
    const medidos: Record<string, number> = {
      'R$ 1.234,56': 5.68,
      'R$ 9.999,99': 5.77,
      'R$ 12.345,67': 6.3,
      'R$ 123.456,78': 6.9,
    };

    for (const [valor, em] of Object.entries(medidos)) {
      expect(em * tamanhoFonteValor(valor)).toBeLessThanOrEqual(larguraEmUtil);
    }
  });
});

describe('CampoMoeda', () => {
  it('mascara enquanto digita e devolve o decimal da API', async () => {
    const aoMudar = jest.fn();
    await renderizar(<CampoMoeda value="" onChangeValor={aoMudar} />);

    await fireEvent.changeText(screen.getByPlaceholderText('0,00'), '12990');

    expect(aoMudar).toHaveBeenCalledWith('129,90', '129.90');
  });
});

describe('CampoSelecao', () => {
  const opcoes = [
    { valor: 1, rotulo: 'Mensal', descricao: 'R$ 99,90' },
    { valor: 2, rotulo: 'Anual' },
  ];

  it('abre a lista, escolhe a opção e fecha', async () => {
    const aoMudar = jest.fn();
    await renderizar(<CampoSelecao rotulo="Plano" opcoes={opcoes} valor={null} aoMudar={aoMudar} testID="plano" />);

    expect(screen.getByText('Selecione')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('plano'));
    await fireEvent.press(screen.getByTestId('selecao-opcao-2'));

    expect(aoMudar).toHaveBeenCalledWith(2);
    expect(screen.queryByTestId('selecao-opcao-2')).toBeNull();
  });

  it('mostra o rótulo da opção escolhida', async () => {
    await renderizar(<CampoSelecao rotulo="Plano" opcoes={opcoes} valor={1} aoMudar={jest.fn()} />);

    expect(screen.getByText('Mensal')).toBeTruthy();
  });
});

describe('BarraAbas em modo largo (sidebar)', () => {
  const rotas = [
    { key: 'r1', name: 'painel', params: undefined },
    { key: 'r2', name: 'fichas', params: undefined },
  ];
  const abas = {
    painel: { rotulo: 'Início', icone: 'home-outline', iconeAtivo: 'home' },
    fichas: { rotulo: 'Fichas', icone: 'clipboard-outline', iconeAtivo: 'clipboard' },
  } as const;

  function montar() {
    const navigation = { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() };
    const props = { state: { index: 0, routes: rotas }, navigation } as unknown as Omit<
      ComponentProps<typeof BarraAbas>,
      'abas'
    >;

    return { navigation, props };
  }

  it('>= 1024 vira sidebar com itens, usuário e Sair; < 1024 mantém a barra inferior', async () => {
    const { props } = montar();
    mockLargura = 1280;
    const { rerender } = await renderizar(
      <ContextoAutenticacao.Provider value={{ usuario: { id: 1, email: 'admin@x.com', tipo: 'admin', foto: null }, sair: jest.fn() } as never}>
        <BarraAbas {...props} abas={abas} />
      </ContextoAutenticacao.Provider>,
    );

    expect(screen.getByTestId('barra-lateral')).toBeTruthy();
    expect(screen.queryByTestId('barra-abas')).toBeNull();
    expect(screen.getByText('Início')).toBeTruthy();
    expect(screen.getByText('admin@x.com')).toBeTruthy();
    expect(screen.getByTestId('aba-Início').props.accessibilityState.selected).toBe(true);

    mockLargura = 600;
    await rerender(
      <SafeAreaProvider initialMetrics={METRICAS}>
        <ProvedorAlerta>
          <BarraAbas {...props} abas={abas} />
        </ProvedorAlerta>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId('barra-abas')).toBeTruthy();
    expect(screen.queryByTestId('barra-lateral')).toBeNull();
  });

  it('navega ao tocar num item e confirma antes de sair', async () => {
    const { navigation, props } = montar();
    const sair = jest.fn();
    mockLargura = 1280;
    await renderizar(
      <ContextoAutenticacao.Provider value={{ usuario: null, sair } as never}>
        <BarraAbas {...props} abas={abas} />
      </ContextoAutenticacao.Provider>,
    );

    await fireEvent.press(screen.getByTestId('aba-Fichas'));
    expect(navigation.navigate).toHaveBeenCalledWith('fichas', undefined);

    await fireEvent.press(screen.getByTestId('botao-sair-barra'));
    expect(screen.getByText('Deseja sair da sua conta?')).toBeTruthy();
    expect(sair).not.toHaveBeenCalled();
  });
});


describe('linha/cartão clicável com botões dentro (QA-GA-02 / TD-66)', () => {
  type Linha = { id: number; nome: string };
  const colunas: ColunaTabela<Linha>[] = [
    { chave: 'nome', titulo: 'Nome', principal: true, render: (l) => l.nome },
    { chave: 'acoes', titulo: 'Ações', acoes: true, render: (l) => <Botao onPress={jest.fn()} testID={`aprovar-${l.id}`}>Aprovar</Botao> },
  ];
  const colunasSemAcoes: ColunaTabela<Linha>[] = [colunas[0]];
  const dados = [{ id: 1, nome: 'Ana' }];

  afterEach(() => jest.restoreAllMocks());

  it('na web a linha com ações não é role=button, mas continua focável e aciona a linha', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const aoPressionar = jest.fn();
    await renderizar(<TabelaDados colunas={colunas} dados={dados} chaveItem={(l) => l.id} aoPressionar={aoPressionar} testID="t" />);

    const area = screen.getByTestId(/^t-(linha|cartao)-1$/);
    expect(area.props.role).toBe('group');
    expect(area.props.accessibilityRole).toBeUndefined();
    expect(area.props['aria-roledescription']).toBe('item acionável');

    await fireEvent.press(area);
    expect(aoPressionar).toHaveBeenCalledWith(dados[0]);
    expect(screen.getByTestId('aprovar-1')).toBeTruthy();
  });

  it('sem colunas de ações a área continua sendo um botão para o leitor de tela', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await renderizar(<TabelaDados colunas={colunasSemAcoes} dados={dados} chaveItem={(l) => l.id} aoPressionar={jest.fn()} testID="t" />);

    expect(screen.getByTestId(/^t-(linha|cartao)-1$/).props.accessibilityRole).toBe('button');
  });

  it('no app nativo nada muda: continua botão', async () => {
    await renderizar(<TabelaDados colunas={colunas} dados={dados} chaveItem={(l) => l.id} aoPressionar={jest.fn()} testID="t" />);

    expect(screen.getByTestId(/^t-(linha|cartao)-1$/).props.accessibilityRole).toBe('button');
  });

  it('larguraMinimaColuna cobre título em caixa alta e o ícone de ordenação (QA-GA-04)', () => {
    expect(larguraMinimaColuna({ titulo: 'Vencimento', ordenavel: true })).toBeGreaterThanOrEqual(84 + 14 + 6);
    expect(larguraMinimaColuna({ titulo: 'Vencimento', ordenavel: true })).toBeGreaterThan(larguraMinimaColuna({ titulo: 'Vencimento' }));
  });
});
