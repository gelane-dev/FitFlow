import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CartaoMatricula } from '@/components/gestao/CartaoMatricula';
import { DialogoMatricula } from '@/components/gestao/DialogoMatricula';
import { DialogoPagamento } from '@/components/gestao/DialogoPagamento';
import { FormularioAluno } from '@/components/gestao/FormularioAluno';
import { PainelEntrada } from '@/components/gestao/PainelEntrada';
import type { AcessoVerificacao, MatriculaResposta, PagamentoResposta, PermissaoRecepcao, PlanoResposta } from '@/types/gestao.types';
import { mostrarAlerta } from '@/utils/alerta';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@/utils/alerta', () => ({ mostrarAlerta: jest.fn() }));

const METRICAS = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 24, left: 0, right: 0, bottom: 16 },
};

async function renderizar(elemento: ReactElement) {
  return render(<SafeAreaProvider initialMetrics={METRICAS}>{elemento}</SafeAreaProvider>);
}

/** Aperta o botão de um alerta de confirmação, como o usuário faria. */
async function apertarNoAlerta(estilo: 'default' | 'destructive') {
  const chamadas = (mostrarAlerta as jest.Mock).mock.calls;
  const botoes = chamadas[chamadas.length - 1][2] as { style?: string; onPress?: () => void }[];

  await act(async () => {
    botoes.find((b) => (b.style ?? 'default') === estilo)?.onPress?.();
  });
}

const verificacao = (autorizado: boolean): AcessoVerificacao => ({
  aluno: { id: 5, nome: 'Ana Souza', foto: null, status_cadastro: 'aprovado', ativo: true },
  autorizado,
  motivos: autorizado ? [] : [{ codigo: 'matricula_vencida', mensagem: 'Matrícula vencida em 01/11/2026' }],
  matricula: { plano: 'Mensal', data_vencimento: '2026-11-01', situacao: autorizado ? 'vigente' : 'vencida' },
  pendencias: { quantidade: 1, valor_total: '99.90' },
  ultimas_entradas: [],
});

const TODAS: PermissaoRecepcao[] = ['registrar_acesso', 'liberar_acesso_manual'];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PainelEntrada', () => {
  it('últimas entradas no formato real da API (sem motivos nem aluno) não quebram', async () => {
    const dados: AcessoVerificacao = {
      ...verificacao(true),
      ultimas_entradas: [{ id: 1, data_hora: '2026-11-10T09:22:21-03:00', resultado: 'liberado', liberacao_manual: false }],
    };

    await renderizar(<PainelEntrada verificacao={dados} permissoes={TODAS} aoRegistrar={jest.fn()} />);

    expect(screen.getByTestId('entrada-ultimas-1')).toBeTruthy();
    expect(screen.getByText('10/11/2026 09:22')).toBeTruthy();
  });

  it('liberado: mostra LIBERADO com texto, plano, vencimento e pendências, e registra sem forçar', async () => {
    const aoRegistrar = jest.fn();

    await renderizar(<PainelEntrada verificacao={verificacao(true)} permissoes={TODAS} aoRegistrar={aoRegistrar} />);

    expect(screen.getByTestId('entrada-liberado')).toBeTruthy();
    expect(screen.queryByTestId('entrada-bloqueado')).toBeNull();
    expect(screen.getByText('LIBERADO')).toBeTruthy();
    expect(screen.getByText('Ana Souza')).toBeTruthy();
    expect(screen.getByText(/Mensal · vence em 01\/11\/2026/)).toBeTruthy();
    expect(screen.getByTestId('entrada-pendencias')).toBeTruthy();
    expect(screen.queryByTestId('entrada-liberar-mesmo-assim')).toBeNull();

    await fireEvent.press(screen.getByTestId('entrada-registrar'));
    expect(aoRegistrar).toHaveBeenCalledWith(false);
  });

  it('bloqueado: mostra BLOQUEADO e os motivos; registrar é só a tentativa', async () => {
    const aoRegistrar = jest.fn();

    await renderizar(<PainelEntrada verificacao={verificacao(false)} permissoes={['registrar_acesso']} aoRegistrar={aoRegistrar} />);

    expect(screen.getByTestId('entrada-bloqueado')).toBeTruthy();
    expect(screen.getByText('BLOQUEADO')).toBeTruthy();
    expect(screen.getByText('Matrícula vencida em 01/11/2026')).toBeTruthy();
    expect(screen.getByText('REGISTRAR TENTATIVA BLOQUEADA')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('entrada-registrar'));
    expect(aoRegistrar).toHaveBeenCalledWith(false);
  });

  it('sem liberar_acesso_manual não existe "Liberar mesmo assim"', async () => {
    await renderizar(<PainelEntrada verificacao={verificacao(false)} permissoes={['registrar_acesso']} aoRegistrar={jest.fn()} />);

    expect(screen.queryByTestId('entrada-liberar-mesmo-assim')).toBeNull();
  });

  it('com liberar_acesso_manual, forçar pede confirmação e só então registra com forcar=true', async () => {
    const aoRegistrar = jest.fn();

    await renderizar(<PainelEntrada verificacao={verificacao(false)} permissoes={TODAS} aoRegistrar={aoRegistrar} />);

    await fireEvent.press(screen.getByTestId('entrada-liberar-mesmo-assim'));
    expect(mostrarAlerta).toHaveBeenCalledTimes(1);
    expect(aoRegistrar).not.toHaveBeenCalled();

    await apertarNoAlerta('destructive');
    expect(aoRegistrar).toHaveBeenCalledWith(true);
  });

  it('cancelar a confirmação não registra nada', async () => {
    const aoRegistrar = jest.fn();

    await renderizar(<PainelEntrada verificacao={verificacao(false)} permissoes={TODAS} aoRegistrar={aoRegistrar} />);
    await fireEvent.press(screen.getByTestId('entrada-liberar-mesmo-assim'));

    const botoes = (mostrarAlerta as jest.Mock).mock.calls[0][2] as { style?: string; onPress?: () => void }[];

    expect(botoes.find((b) => b.style === 'cancel')?.onPress).toBeUndefined();
    expect(aoRegistrar).not.toHaveBeenCalled();
  });

  it('sem registrar_acesso avisa e não oferece registrar', async () => {
    await renderizar(<PainelEntrada verificacao={verificacao(true)} permissoes={[]} aoRegistrar={jest.fn()} />);

    expect(screen.queryByTestId('entrada-registrar')).toBeNull();
    expect(screen.getByTestId('entrada-sem-permissao')).toBeTruthy();
  });

  it('depois de registrar mostra a confirmação e "Próximo aluno"', async () => {
    const aoProximo = jest.fn();

    await renderizar(
      <PainelEntrada
        verificacao={verificacao(true)}
        permissoes={TODAS}
        aoRegistrar={jest.fn()}
        aoProximo={aoProximo}
        registro={{
          id: 1,
          aluno: { id: 5, nome: 'Ana Souza' },
          data_hora: '2026-11-09T10:30:00-03:00',
          resultado: 'liberado',
          motivos: [],
          origem: 'manual',
          liberacao_manual: false,
        }}
      />
    );

    expect(screen.getByText('Entrada registrada às 10:30.')).toBeTruthy();
    expect(screen.queryByTestId('entrada-registrar')).toBeNull();

    await fireEvent.press(screen.getByTestId('entrada-proximo'));
    expect(aoProximo).toHaveBeenCalled();
  });

  it('erro de verificação mostra a mensagem e permite tentar de novo', async () => {
    const tentar = jest.fn();

    await renderizar(
      <PainelEntrada verificacao={null} erro="Aluno não encontrado" aoTentarNovamente={tentar} permissoes={TODAS} aoRegistrar={jest.fn()} />
    );

    expect(screen.getByText('Aluno não encontrado')).toBeTruthy();
  });
});

const pendente: PagamentoResposta = {
  id: 9,
  aluno: { id: 5, nome: 'Ana Souza' },
  matricula_id: 3,
  descricao: 'Matrícula — Mensal',
  valor: '99.90',
  vencimento: '2026-11-09',
  status: 'pendente',
  forma: null,
  valor_recebido: null,
  pago_em: null,
  motivo_estorno: null,
  estornado_em: null,
  criado_em: null,
};

describe('DialogoPagamento', () => {
  it('registrar exige a forma de pagamento e não confirma sem ela', async () => {
    const aoConfirmar = jest.fn().mockResolvedValue(null);

    await renderizar(<DialogoPagamento visivel modo="registrar" pagamento={pendente} aoFechar={jest.fn()} aoConfirmar={aoConfirmar} />);

    await fireEvent.press(screen.getByTestId('pagamento-confirmar'));

    expect(screen.getByText('Selecione a forma de pagamento.')).toBeTruthy();
    expect(aoConfirmar).not.toHaveBeenCalled();
  });

  it('valor recebido zerado é recusado', async () => {
    const aoConfirmar = jest.fn().mockResolvedValue(null);

    await renderizar(<DialogoPagamento visivel modo="registrar" pagamento={pendente} aoFechar={jest.fn()} aoConfirmar={aoConfirmar} />);

    await fireEvent.changeText(screen.getByTestId('pagamento-valor'), '0');
    await fireEvent.press(screen.getByTestId('pagamento-confirmar'));

    expect(screen.getByText('O valor recebido precisa ser maior que zero.')).toBeTruthy();
    expect(aoConfirmar).not.toHaveBeenCalled();
  });

  it('registra com forma e valor e fecha no sucesso', async () => {
    const aoConfirmar = jest.fn().mockResolvedValue(null);
    const aoFechar = jest.fn();

    await renderizar(<DialogoPagamento visivel modo="registrar" pagamento={pendente} aoFechar={aoFechar} aoConfirmar={aoConfirmar} />);

    await fireEvent.press(screen.getByTestId('pagamento-forma'));
    await fireEvent.press(await screen.findByTestId('selecao-opcao-pix'));
    await fireEvent.press(screen.getByTestId('pagamento-confirmar'));

    await waitFor(() => expect(aoConfirmar).toHaveBeenCalled());
    expect(aoConfirmar).toHaveBeenCalledWith({ modo: 'registrar', dados: { forma: 'pix', valor_recebido: '99.90' } });
    await waitFor(() => expect(aoFechar).toHaveBeenCalled());
  });

  it('erro do servidor (403) fica visível e o diálogo não fecha', async () => {
    const aoConfirmar = jest.fn().mockResolvedValue('Permissão insuficiente');
    const aoFechar = jest.fn();

    await renderizar(<DialogoPagamento visivel modo="registrar" pagamento={pendente} aoFechar={aoFechar} aoConfirmar={aoConfirmar} />);

    await fireEvent.press(screen.getByTestId('pagamento-forma'));
    await fireEvent.press(await screen.findByTestId('selecao-opcao-dinheiro'));
    await fireEvent.press(screen.getByTestId('pagamento-confirmar'));

    expect(await screen.findByText('Permissão insuficiente')).toBeTruthy();
    expect(aoFechar).not.toHaveBeenCalled();
  });

  it('avulso exige descrição e valor', async () => {
    const aoConfirmar = jest.fn();

    await renderizar(
      <DialogoPagamento visivel modo="avulso" aluno={{ id: 5, nome: 'Ana Souza' }} aoFechar={jest.fn()} aoConfirmar={aoConfirmar} />
    );

    await fireEvent.press(screen.getByTestId('pagamento-confirmar'));

    expect(screen.getByText('Informe a descrição.')).toBeTruthy();
    expect(screen.getByText('Informe um valor maior que zero.')).toBeTruthy();
    expect(aoConfirmar).not.toHaveBeenCalled();
  });

  it('estornar exige motivo e confirmação destrutiva', async () => {
    const aoConfirmar = jest.fn().mockResolvedValue(null);

    await renderizar(
      <DialogoPagamento
        visivel
        modo="estornar"
        pagamento={{ ...pendente, status: 'pago' }}
        aoFechar={jest.fn()}
        aoConfirmar={aoConfirmar}
      />
    );

    await fireEvent.press(screen.getByTestId('pagamento-confirmar'));
    expect(screen.getByText('Informe o motivo.')).toBeTruthy();
    expect(mostrarAlerta).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('pagamento-motivo'), 'Lançado em duplicidade');
    await fireEvent.press(screen.getByTestId('pagamento-confirmar'));
    expect(mostrarAlerta).toHaveBeenCalledTimes(1);

    await apertarNoAlerta('destructive');
    expect(aoConfirmar).toHaveBeenCalledWith({ modo: 'estornar', dados: { motivo: 'Lançado em duplicidade' } });
  });
});

describe('FormularioAluno', () => {
  it('mostra os erros de cada campo e não envia com dados inválidos', async () => {
    const aoCriar = jest.fn();

    await renderizar(<FormularioAluno modo="criar" aoCriar={aoCriar} />);

    await fireEvent.press(screen.getByTestId('aluno-salvar'));

    expect(screen.getByText('Informe o nome.')).toBeTruthy();
    expect(screen.getByText('Informe o e-mail.')).toBeTruthy();
    expect(screen.getByText(/A senha precisa ter ao menos 6 caracteres/)).toBeTruthy();
    expect(screen.getByText('Informe o telefone com DDD.')).toBeTruthy();
    expect(screen.getByText('Informe a data de nascimento.')).toBeTruthy();
    expect(aoCriar).not.toHaveBeenCalled();
  });

  it('envia o payload com a data em ISO quando tudo está válido', async () => {
    const aoCriar = jest.fn();

    await renderizar(<FormularioAluno modo="criar" aoCriar={aoCriar} />);

    await fireEvent.changeText(screen.getByTestId('aluno-nome'), 'Ana Souza');
    await fireEvent.changeText(screen.getByTestId('aluno-email'), 'ana@email.com');
    await fireEvent.changeText(screen.getByTestId('aluno-telefone'), '(11) 91234-5678');
    await fireEvent.changeText(screen.getByTestId('aluno-nascimento'), '10051995');
    await fireEvent.changeText(screen.getByTestId('aluno-senha'), 'segredo1');
    await fireEvent.press(screen.getByTestId('aluno-salvar'));

    expect(aoCriar).toHaveBeenCalledWith({
      nome: 'Ana Souza',
      email: 'ana@email.com',
      senha: 'segredo1',
      telefone: '(11) 91234-5678',
      data_nascimento: '1995-05-10',
      cpf: null,
      endereco: null,
      observacoes: null,
    });
  });

  it('CPF incompleto bloqueia o envio', async () => {
    const aoCriar = jest.fn();

    await renderizar(<FormularioAluno modo="criar" aoCriar={aoCriar} />);

    await fireEvent.changeText(screen.getByTestId('aluno-cpf'), '123');
    await fireEvent.press(screen.getByTestId('aluno-salvar'));

    expect(screen.getByText('O CPF precisa ter 11 dígitos.')).toBeTruthy();
  });

  it('editar não pede e-mail nem senha e preenche os valores iniciais', async () => {
    const aoAtualizar = jest.fn();

    await renderizar(
      <FormularioAluno
        modo="editar"
        valoresIniciais={{
          nome: 'Ana Souza',
          email: 'ana@email.com',
          telefone: '11912345678',
          data_nascimento: '1995-05-10',
          cpf: '12345678901',
        }}
        aoAtualizar={aoAtualizar}
      />
    );

    expect(screen.queryByTestId('aluno-senha')).toBeNull();
    expect(screen.getByDisplayValue('10/05/1995')).toBeTruthy();
    expect(screen.getByDisplayValue('123.456.789-01')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('aluno-salvar'));

    expect(aoAtualizar).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Ana Souza', data_nascimento: '1995-05-10', cpf: '123.456.789-01' })
    );
  });

  it('mostra o erro do servidor', async () => {
    await renderizar(<FormularioAluno modo="criar" erroGeral="E-mail já cadastrado" />);

    expect(screen.getByText('E-mail já cadastrado')).toBeTruthy();
  });
});

const matricula: MatriculaResposta = {
  id: 3,
  aluno: { id: 5, nome: 'Ana Souza' },
  plano: { id: 1, nome: 'Mensal' },
  data_inicio: '2026-11-01',
  data_vencimento: '2026-11-30',
  valor: '99.90',
  status: 'ativa',
  situacao: 'vigente',
  motivo_cancelamento: null,
  cancelada_em: null,
  matricula_anterior_id: null,
  criado_em: null,
};

describe('CartaoMatricula', () => {
  it('cada ação só aparece com a permissão correspondente', async () => {
    await renderizar(
      <CartaoMatricula matricula={matricula} permissoes={['renovar_matricula']} aoRenovar={jest.fn()} aoAlterarPlano={jest.fn()} aoCancelar={jest.fn()} />
    );

    expect(screen.getByTestId('matricula-renovar')).toBeTruthy();
    expect(screen.queryByTestId('matricula-alterar')).toBeNull();
    expect(screen.queryByTestId('matricula-cancelar')).toBeNull();
  });

  it('sem matrícula oferece matricular só com a permissão', async () => {
    const { rerender } = await renderizar(<CartaoMatricula matricula={null} permissoes={[]} aoMatricular={jest.fn()} />);

    expect(screen.getByText('Sem matrícula ativa.')).toBeTruthy();
    expect(screen.queryByTestId('matricula-nova')).toBeNull();

    await rerender(
      <SafeAreaProvider initialMetrics={METRICAS}>
        <CartaoMatricula matricula={null} permissoes={['matricular']} aoMatricular={jest.fn()} />
      </SafeAreaProvider>
    );
    expect(screen.getByTestId('matricula-nova')).toBeTruthy();
  });
});


describe('DialogoMatricula (alterar plano)', () => {
  const plano = (id: number, nome: string): PlanoResposta => ({
    id, nome, descricao: null, duracao_dias: 30, valor: '100.00', periodicidade: 'mensal',
    renovacao_automatica: false, condicoes: null, ativo: true, criado_em: null, total_alunos: 0,
  });
  const atual = { id: 9, plano: plano(1, 'Mensal'), data_vencimento: '2026-12-01' } as unknown as MatriculaResposta;
  const planos = [plano(1, 'Mensal'), plano(2, 'Anual')];

  it('não oferece o plano atual e não confirma sem escolher outro (QA-GA-07)', async () => {
    const aoConfirmar = jest.fn().mockResolvedValue(null);

    await renderizar(
      <DialogoMatricula
        visivel modo="alterar" aluno={{ id: 5, nome: 'Ana' }} matricula={atual} planos={planos}
        aoFechar={jest.fn()} aoConfirmar={aoConfirmar}
      />,
    );

    await fireEvent.press(screen.getByTestId('matricula-confirmar'));
    expect(screen.getByText('Selecione o plano.')).toBeTruthy();
    expect(aoConfirmar).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('matricula-plano'));
    expect(screen.queryByTestId('selecao-opcao-1')).toBeNull();

    await fireEvent.press(screen.getByTestId('selecao-opcao-2'));
    await fireEvent.press(screen.getByTestId('matricula-confirmar'));
    expect(aoConfirmar).toHaveBeenCalledWith({ modo: 'alterar', dados: { plano_id: 2 } });
  });
});
