import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AxiosError } from 'axios';

import { ehCodigoAcesso, useRecepcaoEntrada } from '@/hooks/useRecepcaoEntrada';
import { listarAcessos, registrarAcesso, verificarAcesso } from '@/services/acessos.service';
import { listarGestaoAlunos } from '@/services/gestaoAlunos.service';

jest.mock('@/services/acessos.service');
jest.mock('@/services/gestaoAlunos.service');

const pagina = (itens: unknown[]) => ({ itens, total: itens.length, pagina: 1, por_pagina: 8 });

function adiada<T>() {
  let resolver!: (v: T) => void;
  const promessa = new Promise<T>((r) => {
    resolver = r;
  });

  return { promessa, resolver };
}

const verificacao = (autorizado: boolean) => ({
  aluno: { id: 5, nome: 'Ana', foto: null, status_cadastro: 'aprovado', ativo: true },
  autorizado,
  motivos: autorizado ? [] : [{ codigo: 'sem_matricula', mensagem: 'Sem matrícula ativa' }],
  matricula: null,
  pendencias: { quantidade: 0, valor_total: '0.00' },
  ultimas_entradas: [],
});

describe('ehCodigoAcesso', () => {
  it('reconhece 16 hexadecimais', () => {
    expect(ehCodigoAcesso('a1b2c3d4e5f60718')).toBe(true);
    expect(ehCodigoAcesso('Maria')).toBe(false);
    expect(ehCodigoAcesso('a1b2')).toBe(false);
  });
});

describe('useRecepcaoEntrada', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (listarAcessos as jest.Mock).mockResolvedValue(pagina([]));
  });

  it('busca alunos só com 2 ou mais caracteres', async () => {
    (listarGestaoAlunos as jest.Mock).mockResolvedValue(pagina([{ id: 5, nome: 'Ana' }]));

    const { result } = await renderHook(() => useRecepcaoEntrada());

    await act(async () => result.current.buscar('a'));
    expect(listarGestaoAlunos).not.toHaveBeenCalled();

    await act(async () => result.current.buscar('ana'));
    await waitFor(() => expect(result.current.resultados.dados?.itens).toHaveLength(1));
    expect(listarGestaoAlunos).toHaveBeenCalledWith({ busca: 'ana', por_pagina: 8 });
  });

  it('descarta a resposta de uma busca antiga', async () => {
    const antiga = adiada<unknown>();
    const nova = adiada<unknown>();

    (listarGestaoAlunos as jest.Mock).mockReturnValueOnce(antiga.promessa).mockReturnValueOnce(nova.promessa);

    const { result } = await renderHook(() => useRecepcaoEntrada());

    await act(async () => result.current.buscar('an'));
    await act(async () => result.current.buscar('ana'));
    await act(async () => nova.resolver(pagina([{ id: 5, nome: 'Ana' }])));
    await act(async () => antiga.resolver(pagina([{ id: 9, nome: 'Antonio' }])));

    expect(result.current.resultados.dados?.itens).toEqual([{ id: 5, nome: 'Ana' }]);
  });

  it('um código de acesso verifica direto, sem listar alunos', async () => {
    (verificarAcesso as jest.Mock).mockResolvedValue(verificacao(true));

    const { result } = await renderHook(() => useRecepcaoEntrada());

    await act(async () => result.current.buscar('A1B2C3D4E5F60718'));
    await waitFor(() => expect(result.current.verificacao.dados?.autorizado).toBe(true));

    expect(verificarAcesso).toHaveBeenCalledWith({ codigo: 'a1b2c3d4e5f60718' });
    expect(listarGestaoAlunos).not.toHaveBeenCalled();
  });

  it('registrar chama POST /acessos (liberado) e recarrega as entradas de hoje', async () => {
    (verificarAcesso as jest.Mock).mockResolvedValue(verificacao(true));
    (registrarAcesso as jest.Mock).mockResolvedValue({
      id: 1,
      resultado: 'liberado',
      data_hora: '2026-11-09T10:00:00-03:00',
    });

    const { result } = await renderHook(() => useRecepcaoEntrada());

    await act(async () => result.current.selecionarAluno(5));
    await waitFor(() => expect(result.current.verificacao.dados).not.toBeNull());

    await act(async () => {
      await result.current.registrar(false);
    });

    expect(registrarAcesso).toHaveBeenCalledWith({ aluno_id: 5, origem: 'manual', forcar: false });
    expect(result.current.registro?.resultado).toBe('liberado');
    expect(listarAcessos).toHaveBeenCalledTimes(2);
  });

  it('bloqueado também chama POST /acessos (a tentativa fica no histórico)', async () => {
    (verificarAcesso as jest.Mock).mockResolvedValue(verificacao(false));
    (registrarAcesso as jest.Mock).mockResolvedValue({
      id: 2,
      resultado: 'bloqueado',
      data_hora: '2026-11-09T10:00:00-03:00',
    });

    const { result } = await renderHook(() => useRecepcaoEntrada());

    await act(async () => result.current.selecionarAluno(5));
    await waitFor(() => expect(result.current.verificacao.dados).not.toBeNull());
    await act(async () => {
      await result.current.registrar();
    });

    expect(registrarAcesso).toHaveBeenCalledWith({ aluno_id: 5, origem: 'manual', forcar: false });
    expect(result.current.registro?.resultado).toBe('bloqueado');
  });

  it('forçar envia forcar=true; 403 do servidor vira mensagem e não registra', async () => {
    (verificarAcesso as jest.Mock).mockResolvedValue(verificacao(false));

    const proibido = new AxiosError('403');

    proibido.response = { status: 403, data: { detail: 'Permissão insuficiente' } } as never;
    (registrarAcesso as jest.Mock).mockRejectedValue(proibido);

    const { result } = await renderHook(() => useRecepcaoEntrada());

    await act(async () => result.current.selecionarAluno(5));
    await waitFor(() => expect(result.current.verificacao.dados).not.toBeNull());
    await act(async () => {
      await result.current.registrar(true);
    });

    expect(registrarAcesso).toHaveBeenCalledWith({ aluno_id: 5, origem: 'manual', forcar: true });
    expect(result.current.erroRegistro).toBe('Permissão insuficiente');
    expect(result.current.registro).toBeNull();
  });

  it('próximo aluno limpa a busca e a seleção', async () => {
    (verificarAcesso as jest.Mock).mockResolvedValue(verificacao(true));

    const { result } = await renderHook(() => useRecepcaoEntrada());
    const chave = result.current.chaveBusca;

    await act(async () => result.current.selecionarAluno(5));
    await act(async () => result.current.proximo());

    expect(result.current.alvo).toBeNull();
    expect(result.current.termo).toBe('');
    expect(result.current.chaveBusca).toBe(chave + 1);
  });
});
