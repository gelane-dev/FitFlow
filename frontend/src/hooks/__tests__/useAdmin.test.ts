import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAdminAuditoria } from '@/hooks/useAdminAuditoria';
import { useAdminConfiguracao } from '@/hooks/useAdminConfiguracao';
import { useAdminProfessores, useAdminRecepcionistaDetalhe } from '@/hooks/useAdminEquipe';
import { useAdminFinanceiro, useAdminPagamentos } from '@/hooks/useAdminFinanceiro';
import { useAdminPainel } from '@/hooks/useAdminPainel';
import { useAdminPlanos } from '@/hooks/useAdminPlanos';
import { listarAuditoria } from '@/services/auditoria.service';
import { atualizarConfiguracao, buscarConfiguracaoAdmin } from '@/services/configuracao.service';
import {
  atualizarPermissoesRecepcionista,
  buscarRecepcionista,
  criarProfessor,
  listarProfessores,
} from '@/services/equipe.service';
import { listarPagamentos } from '@/services/pagamentos.service';
import { buscarDashboardAdmin, buscarFinanceiro } from '@/services/paineis.service';
import { alterarStatusPlano, criarPlano, listarPlanos } from '@/services/planos.service';

jest.mock('@/services/paineis.service');
jest.mock('@/services/equipe.service');
jest.mock('@/services/planos.service');
jest.mock('@/services/pagamentos.service');
jest.mock('@/services/configuracao.service');
jest.mock('@/services/auditoria.service');

const m = (fn: unknown) => fn as jest.Mock;

function erroApi(detail: string) {
  return Object.assign(new Error('x'), { isAxiosError: true, response: { data: { detail } } });
}

beforeEach(() => jest.resetAllMocks());

describe('useAdminPainel', () => {
  it('monta os gráficos: sem_data separado e meses em ordem', async () => {
    m(buscarDashboardAdmin).mockResolvedValue({
      totais: {},
      alunos_recentes: [],
      alunos_por_professor: [{ professor_id: null, nome: '', total: 2 }],
      alunos_por_plano: [{ plano_id: 1, nome: 'Mensal', total: 3 }],
      matriculas: { novas_mes: 0, renovacoes_mes: 0, cancelamentos_mes: 0 },
      series: {
        cadastros_por_mes: [
          { mes: '2026-11', total: 1 },
          { mes: '2026-10', total: 2 },
          { mes: 'sem_data', total: 5 },
        ],
        frequencia_por_mes: [{ mes: '2026-11', entradas: 4, alunos_distintos: 2 }],
        ativos_inativos: { ativos: 1, inativos: 2 },
      },
    });

    const { result } = await renderHook(() => useAdminPainel());

    await waitFor(() => expect(result.current.graficos).not.toBeNull());

    expect(result.current.graficos!.cadastros.barras.map((b) => b.rotulo)).toEqual(['out/26', 'nov/26']);
    expect(result.current.graficos!.cadastros.semData).toBe(5);
    expect(result.current.graficos!.porProfessor[0].rotulo).toBe('Sem professor');
    expect(result.current.erro).toBeNull();
  });

  it('expõe a mensagem de erro da API', async () => {
    m(buscarDashboardAdmin).mockRejectedValue(erroApi('Sem permissão'));

    const { result } = await renderHook(() => useAdminPainel());

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.erro).toBe('Sem permissão');
    expect(result.current.graficos).toBeNull();
  });
});

describe('useAdminProfessores', () => {
  it('cria e recarrega a lista', async () => {
    m(listarProfessores).mockResolvedValue([]);
    m(criarProfessor).mockResolvedValue({ id: 2 });

    const { result } = await renderHook(() => useAdminProfessores());

    await waitFor(() => expect(result.current.carregado).toBe(true));

    let resposta: { ok: boolean } | undefined;

    await act(async () => {
      resposta = await result.current.criar({ nome: 'A', email: 'a@a.com', senha: 'Senha@123', telefone: '1' });
    });

    expect(resposta?.ok).toBe(true);
    expect(listarProfessores).toHaveBeenCalledTimes(2);
  });

  it('devolve o erro da API sem recarregar', async () => {
    m(listarProfessores).mockResolvedValue([]);
    m(criarProfessor).mockRejectedValue(erroApi('E-mail já cadastrado'));

    const { result } = await renderHook(() => useAdminProfessores());

    await waitFor(() => expect(result.current.carregado).toBe(true));

    let resposta: { ok: boolean; erro?: string } | undefined;

    await act(async () => {
      resposta = await result.current.criar({ nome: 'A', email: 'a@a.com', senha: 'x', telefone: '1' });
    });

    expect(resposta).toEqual({ ok: false, erro: 'E-mail já cadastrado' });
    expect(listarProfessores).toHaveBeenCalledTimes(1);
  });
});

describe('useAdminRecepcionistaDetalhe', () => {
  it('salva permissões e recarrega o detalhe', async () => {
    m(buscarRecepcionista).mockResolvedValue({ id: 1, permissoes: [], atividade: [] });
    m(atualizarPermissoesRecepcionista).mockResolvedValue({});

    const { result } = await renderHook(() => useAdminRecepcionistaDetalhe(1));

    await waitFor(() => expect(result.current.recepcionista).not.toBeNull());

    await act(async () => {
      await result.current.salvarPermissoes(['matricular']);
    });

    expect(atualizarPermissoesRecepcionista).toHaveBeenCalledWith(1, { permissoes: ['matricular'] });
    expect(buscarRecepcionista).toHaveBeenCalledTimes(2);
  });
});

describe('useAdminPlanos', () => {
  const planos = [
    { id: 1, nome: 'A', ativo: true },
    { id: 2, nome: 'B', ativo: false },
  ];

  it('filtra ativos e inativos no app', async () => {
    m(listarPlanos).mockResolvedValue(planos);

    const { result } = await renderHook(() => useAdminPlanos());

    await waitFor(() => expect(result.current.carregado).toBe(true));
    expect(result.current.planos).toHaveLength(2);

    await act(async () => { result.current.definirFiltro('ativos'); });
    expect(result.current.planos.map((p) => p.id)).toEqual([1]);

    await act(async () => { result.current.definirFiltro('inativos'); });
    expect(result.current.planos.map((p) => p.id)).toEqual([2]);
  });

  it('cria plano e alterna status', async () => {
    m(listarPlanos).mockResolvedValue(planos);
    m(criarPlano).mockResolvedValue({ id: 3 });
    m(alterarStatusPlano).mockResolvedValue({});

    const { result } = await renderHook(() => useAdminPlanos());

    await waitFor(() => expect(result.current.carregado).toBe(true));

    await act(async () => {
      await result.current.criar({
        nome: 'C',
        duracao_dias: 30,
        valor: '99.90',
        periodicidade: 'mensal',
      });
      await result.current.alternarStatus(1, false);
    });

    expect(criarPlano).toHaveBeenCalledTimes(1);
    expect(alterarStatusPlano).toHaveBeenCalledWith(1, { ativo: false });
  });
});

describe('useAdminFinanceiro / useAdminPagamentos', () => {
  const vazioFin = {
    recebido_periodo: '10.00',
    pendente_total: '0.00',
    vencido_total: '0.00',
    inadimplentes: 0,
    recebido_por_mes: [
      { mes: '2026-11', total: '10.00' },
      { mes: '2026-10', total: '0.00' },
    ],
    recebido_por_forma: [{ forma: 'pix', total: '10.00' }],
  };

  it('carrega o mês atual e recarrega ao mudar de mês', async () => {
    m(buscarFinanceiro).mockResolvedValue(vazioFin);

    const { result } = await renderHook(() => useAdminFinanceiro());

    await waitFor(() => expect(result.current.financeiro).not.toBeNull());

    expect(result.current.graficos!.porMes.map((b) => b.rotulo)).toEqual(['out/26', 'nov/26']);

    const inicioAntes = result.current.periodo.inicio;

    await act(async () => { result.current.mudarMes(-1); });

    await waitFor(() => expect(buscarFinanceiro).toHaveBeenCalledTimes(2));

    expect(result.current.periodo.inicio).not.toBe(inicioAntes);
  });

  it('pagamentos: filtro volta para a página 1', async () => {
    m(listarPagamentos).mockResolvedValue({ itens: [], total: 0, pagina: 1, por_pagina: 20 });

    const periodo = { inicio: '2026-11-01', fim: '2026-11-30' };
    const { result } = await renderHook(() => useAdminPagamentos(periodo));

    await waitFor(() => expect(listarPagamentos).toHaveBeenCalledTimes(1));

    await act(async () => { result.current.mudarPagina(3); });
    await waitFor(() => expect(listarPagamentos).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 3 })));

    await act(async () => { result.current.definirFiltros({ status: 'pago' }); });
    await waitFor(() =>
      expect(listarPagamentos).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 1, status: 'pago' }))
    );
  });

  it('erro na lista de pagamentos', async () => {
    m(listarPagamentos).mockRejectedValue(erroApi('Falhou'));

    const { result } = await renderHook(() => useAdminPagamentos({ inicio: '2026-11-01', fim: '2026-11-30' }));

    await waitFor(() => expect(result.current.erro).toBe('Falhou'));
  });
});

describe('useAdminConfiguracao', () => {
  it('salva e recarrega', async () => {
    m(buscarConfiguracaoAdmin).mockResolvedValue({ nome: 'FitFlow', horarios: [] });
    m(atualizarConfiguracao).mockResolvedValue({});

    const { result } = await renderHook(() => useAdminConfiguracao());

    await waitFor(() => expect(result.current.configuracao).not.toBeNull());

    await act(async () => {
      await result.current.salvar(result.current.configuracao as never);
    });

    expect(atualizarConfiguracao).toHaveBeenCalledTimes(1);
    expect(buscarConfiguracaoAdmin).toHaveBeenCalledTimes(2);
  });
});

describe('useAdminAuditoria', () => {
  const pagina = {
    itens: [
      {
        id: 1,
        acao: 'plano.criar',
        entidade: 'plano',
        usuario: { id: 3, nome: 'admin', tipo: 'admin' },
      },
    ],
    total: 1,
    pagina: 1,
    por_pagina: 20,
  };

  it('envia filtros convertidos e volta para a página 1', async () => {
    m(listarAuditoria).mockResolvedValue(pagina);

    const { result } = await renderHook(() => useAdminAuditoria());

    await waitFor(() => expect(result.current.itens).toHaveLength(1));
    expect(result.current.usuarios).toEqual([{ id: 3, nome: 'admin', tipo: 'admin' }]);

    await act(async () => { result.current.mudarPagina(2); });
    await waitFor(() => expect(listarAuditoria).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 2 })));

    await act(async () => { result.current.definirFiltros({ acao: 'plano.criar', userId: 3, inicio: '2026-11-01' }); });

    await waitFor(() =>
      expect(listarAuditoria).toHaveBeenLastCalledWith({
        user_id: 3,
        acao: 'plano.criar',
        entidade: undefined,
        inicio: '2026-11-01',
        fim: undefined,
        pagina: 1,
        por_pagina: 20,
      })
    );
    expect(result.current.filtrosAtivos).toBe(true);

    await act(async () => { result.current.limparFiltros(); });
    await waitFor(() => expect(result.current.filtrosAtivos).toBe(false));
  });

  it('erro de carregamento', async () => {
    m(listarAuditoria).mockRejectedValue(erroApi('Sem acesso'));

    const { result } = await renderHook(() => useAdminAuditoria());

    await waitFor(() => expect(result.current.erro).toBe('Sem acesso'));
  });
});
