import { fireEvent, render, screen } from '@testing-library/react-native';
import { ReactElement } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AcoesAlunoGestao } from '@/components/gestao/AcoesAlunoGestao';
import { DialogosAlunoGestao } from '@/components/gestao/DialogosAlunoGestao';
import { ListaAlunosGestao, ListaAlunosGestaoProps } from '@/components/gestao/ListaAlunosGestao';
import { ListaPagamentosGestao, ListaPagamentosGestaoProps } from '@/components/gestao/ListaPagamentosGestao';
import { Botao } from '@/components/ui/Botao';
import type { GestaoAlunoDetalhe, GestaoAlunoItem, PagamentoResposta } from '@/types/gestao.types';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

const METRICAS = {
  frame: { x: 0, y: 0, width: 1200, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const envolver = (elemento: ReactElement) => <SafeAreaProvider initialMetrics={METRICAS}>{elemento}</SafeAreaProvider>;
const renderizar = (elemento: ReactElement) => render(envolver(elemento));

const aluno = (extra: Partial<GestaoAlunoItem> = {}): GestaoAlunoItem => ({
  id: 7,
  nome: 'Ana Souza',
  email: 'ana@exemplo.com',
  telefone: '11999990000',
  foto: null,
  ativo: true,
  status_cadastro: 'pendente',
  professor: { id: 2, nome: 'Prof. Bruno' },
  plano_atual: { id: 1, nome: 'Mensal' },
  data_vencimento: '2026-12-10',
  situacao: 'vigente',
  inadimplente: false,
  criado_em: null,
  ...extra,
});

const pagamento = (extra: Partial<PagamentoResposta> = {}): PagamentoResposta => ({
  id: 11,
  aluno: { id: 7, nome: 'Ana Souza' },
  matricula_id: 3,
  descricao: 'Mensalidade 12/2026',
  valor: '99.90',
  vencimento: '2026-12-10',
  status: 'pendente',
  forma: null,
  valor_recebido: null,
  pago_em: null,
  motivo_estorno: null,
  estornado_em: null,
  criado_em: null,
  ...extra,
});

function propsAlunos(extra: Partial<ListaAlunosGestaoProps> = {}): ListaAlunosGestaoProps {
  return {
    alunos: [aluno()],
    aoAbrir: jest.fn(),
    colunaContato: 'telefone',
    chips: [{ valor: 'pendente', rotulo: 'Pendentes' }],
    chipAtivo: null,
    aoMudarChip: jest.fn(),
    aoBuscar: jest.fn(),
    vazio: { titulo: 'Nenhum aluno encontrado', descricao: 'Ajuste a busca ou os filtros.' },
    total: 1,
    tamanhoPagina: 20,
    pagina: 1,
    aoMudarPagina: jest.fn(),
    ...extra,
  };
}

describe('ListaAlunosGestao', () => {
  it('com ações de admin: coluna de professor, sem coluna de ações, filtros extras e abertura do aluno', async () => {
    const props = propsAlunos({ colunaContato: 'professor', filtrosExtras: <Text>Filtro de professor</Text> });

    await renderizar(<ListaAlunosGestao {...props} />);

    expect(screen.getByText('Professor')).toBeTruthy();
    expect(screen.getByText('Prof. Bruno')).toBeTruthy();
    expect(screen.queryByText('Telefone')).toBeNull();
    expect(screen.getByText('Filtro de professor')).toBeTruthy();

    await fireEvent.press(screen.getByText('Ana Souza'));
    expect(props.aoAbrir).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
  });

  it('com permissão de recepção: mostra telefone e os botões renderizados pelo papel', async () => {
    const aprovar = jest.fn();
    const props = propsAlunos({
      renderAcoes: (a) => (
        <Botao tamanho="pequeno" larguraTotal={false} onPress={() => aprovar(a.id)} testID={`aprovar-${a.id}`}>
          Aprovar
        </Botao>
      ),
    });

    await renderizar(<ListaAlunosGestao {...props} />);

    expect(screen.getByText('Telefone')).toBeTruthy();
    expect(screen.getByText('11999990000')).toBeTruthy();
    expect(screen.queryByText('Professor')).toBeNull();

    await fireEvent.press(screen.getByTestId('aprovar-7'));
    expect(aprovar).toHaveBeenCalledWith(7);
  });

  it('sem permissão de recepção: a célula de ações fica vazia', async () => {
    await renderizar(<ListaAlunosGestao {...propsAlunos({ renderAcoes: () => null })} />);

    expect(screen.queryByTestId('aprovar-7')).toBeNull();
  });

  it('mostra o selo de inadimplente junto da situação', async () => {
    await renderizar(<ListaAlunosGestao {...propsAlunos({ alunos: [aluno({ inadimplente: true })] })} />);

    expect(screen.getByText('Inadimplente')).toBeTruthy();
  });

  it('estado vazio com o texto do papel', async () => {
    await renderizar(<ListaAlunosGestao {...propsAlunos({ alunos: [], total: 0 })} />);

    expect(screen.getByText('Nenhum aluno encontrado')).toBeTruthy();
    expect(screen.getByText('Ajuste a busca ou os filtros.')).toBeTruthy();
  });

  it('erro com botão de tentar novamente', async () => {
    const recarregar = jest.fn();

    await renderizar(<ListaAlunosGestao {...propsAlunos({ alunos: [], erro: 'Falha ao listar', aoTentarNovamente: recarregar })} />);

    expect(screen.getByText('Falha ao listar')).toBeTruthy();
    await fireEvent.press(screen.getByText('Tentar novamente'));
    expect(recarregar).toHaveBeenCalled();
  });

  it('chip de situação chama o callback da tela', async () => {
    const props = propsAlunos();

    await renderizar(<ListaAlunosGestao {...props} />);
    await fireEvent.press(screen.getByText('Pendentes'));
    expect(props.aoMudarChip).toHaveBeenCalledWith('pendente');
  });
});

function propsPagamentos(extra: Partial<ListaPagamentosGestaoProps> = {}): ListaPagamentosGestaoProps {
  return {
    pagamentos: [pagamento()],
    renderAluno: (p) => <Text>{p.aluno.nome}</Text>,
    renderAcoes: () => null,
    vazio: { titulo: 'Nenhum pagamento encontrado', descricao: 'Ajuste os filtros.' },
    total: 1,
    tamanhoPagina: 20,
    pagina: 1,
    aoMudarPagina: jest.fn(),
    ...extra,
  };
}

describe('ListaPagamentosGestao', () => {
  it('com ações de admin: descrição em coluna própria, motivo do estorno e botão de estornar', async () => {
    const estornar = jest.fn();

    await renderizar(
      <ListaPagamentosGestao
        {...propsPagamentos({
          pagamentos: [pagamento({ status: 'estornado', motivo_estorno: 'Cobrança duplicada' }), pagamento({ id: 12, status: 'pago' })],
          colunaDescricao: true,
          tituloStatus: 'Situação',
          mostrarMotivoEstorno: true,
          renderAcoes: (p) =>
            p.status === 'pago' ? (
              <Botao tamanho="medio" larguraTotal={false} onPress={() => estornar(p.id)} testID={`estornar-${p.id}`}>
                Estornar
              </Botao>
            ) : null,
        })}
      />
    );

    expect(screen.getAllByText('Descrição').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Situação').length).toBeGreaterThan(0);
    expect(screen.getByText('Motivo: Cobrança duplicada')).toBeTruthy();
    expect(screen.queryByTestId('estornar-11')).toBeNull();

    await fireEvent.press(screen.getByTestId('estornar-12'));
    expect(estornar).toHaveBeenCalledWith(12);
  });

  it('com permissão de recepção: coluna Status e botão de receber só para pendentes', async () => {
    const receber = jest.fn();

    await renderizar(
      <ListaPagamentosGestao
        {...propsPagamentos({
          renderAcoes: (p) =>
            p.status === 'pendente' ? (
              <Botao tamanho="pequeno" larguraTotal={false} onPress={() => receber(p.id)} testID={`pagamento-${p.id}-receber`}>
                Receber
              </Botao>
            ) : null,
        })}
      />
    );

    expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
    expect(screen.queryByText('Descrição')).toBeNull();
    expect(screen.queryByText(/Motivo:/)).toBeNull();

    await fireEvent.press(screen.getByTestId('pagamento-11-receber'));
    expect(receber).toHaveBeenCalledWith(11);
  });

  it('sem permissão de recepção: nenhuma ação na linha', async () => {
    await renderizar(<ListaPagamentosGestao {...propsPagamentos()} />);

    expect(screen.queryByText('Receber')).toBeNull();
  });

  it('estado vazio', async () => {
    await renderizar(<ListaPagamentosGestao {...propsPagamentos({ pagamentos: [], total: 0 })} />);

    expect(screen.getByText('Nenhum pagamento encontrado')).toBeTruthy();
  });

  it('erro com botão de tentar novamente', async () => {
    const recarregar = jest.fn();

    await renderizar(
      <ListaPagamentosGestao {...propsPagamentos({ pagamentos: [], total: 0, erro: 'Falha ao listar', aoTentarNovamente: recarregar })} />
    );

    await fireEvent.press(screen.getByText('Tentar novamente'));
    expect(recarregar).toHaveBeenCalled();
  });
});

describe('AcoesAlunoGestao', () => {
  const base = () => ({
    aluno: { id: 7, status_cadastro: 'pendente' as const },
    aoEditar: jest.fn(),
    aoAprovar: jest.fn(),
    aoRecusar: jest.fn(),
    processando: null,
  });

  it('admin: editar, aprovar, recusar e a ação extra do papel', async () => {
    const props = base();

    await renderizar(
      <AcoesAlunoGestao {...props} podeEditar podeAprovar>
        <Botao tamanho="medio" larguraTotal={false} onPress={() => undefined} testID="aluno-status">
          Desativar
        </Botao>
      </AcoesAlunoGestao>
    );

    await fireEvent.press(screen.getByTestId('aluno-editar'));
    await fireEvent.press(screen.getByTestId('aluno-aprovar'));
    await fireEvent.press(screen.getByTestId('aluno-recusar'));
    expect(props.aoEditar).toHaveBeenCalled();
    expect(props.aoAprovar).toHaveBeenCalled();
    expect(props.aoRecusar).toHaveBeenCalled();
    expect(screen.getByTestId('aluno-status')).toBeTruthy();
  });

  it('recepção sem permissões: nenhum botão', async () => {
    await renderizar(<AcoesAlunoGestao {...base()} podeEditar={false} podeAprovar={false} />);

    expect(screen.queryByTestId('aluno-editar')).toBeNull();
    expect(screen.queryByTestId('aluno-aprovar')).toBeNull();
  });

  it('aprovar/recusar só aparecem com o cadastro pendente', async () => {
    await renderizar(<AcoesAlunoGestao {...base()} aluno={{ id: 7, status_cadastro: 'aprovado' }} podeEditar podeAprovar />);

    expect(screen.getByTestId('aluno-editar')).toBeTruthy();
    expect(screen.queryByTestId('aluno-aprovar')).toBeNull();
  });

  it('desabilita aprovar/recusar enquanto o aluno é processado', async () => {
    const props = base();

    await renderizar(<AcoesAlunoGestao {...props} processando={7} podeEditar podeAprovar />);

    await fireEvent.press(screen.getByTestId('aluno-aprovar'));
    expect(props.aoAprovar).not.toHaveBeenCalled();
  });
});

describe('DialogosAlunoGestao', () => {
  const detalhe: GestaoAlunoDetalhe = {
    ...aluno({ status_cadastro: 'aprovado' }),
    cpf: null,
    endereco: null,
    observacoes: null,
    data_nascimento: '1995-05-20',
    restricao_acesso: null,
    codigo_acesso: 'ABC123',
    matricula_atual: null,
    aprovado_em: null,
  };

  it('abre o formulário de edição quando `editando`, com o erro e o rótulo do papel', async () => {
    await renderizar(
      <DialogosAlunoGestao
        aluno={detalhe}
        matriculaAtual={null}
        planos={{ dados: [], carregando: false, erro: null }}
        modoMatricula={null}
        aoFecharMatricula={jest.fn()}
        aoConfirmarMatricula={jest.fn()}
        dialogoPagamento={null}
        aoFecharPagamento={jest.fn()}
        aoConfirmarPagamento={jest.fn()}
        editando
        aoFecharEdicao={jest.fn()}
        formulario={{ aoAtualizar: jest.fn(), enviando: false, erroGeral: 'E-mail já cadastrado', rotuloEnviar: 'Salvar alterações' }}
      />
    );

    expect(screen.getByText('Editar aluno')).toBeTruthy();
    expect(screen.getByText('E-mail já cadastrado')).toBeTruthy();
    expect(screen.getByText('Salvar alterações')).toBeTruthy();
  });
});
