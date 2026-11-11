import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AxiosError } from 'axios';
import { ReactNode } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useGestaoAcoesFinanceiras } from '@/hooks/useGestaoAcoesFinanceiras';
import { useGestaoAprovacao } from '@/hooks/useGestaoAprovacao';
import { useGestaoCriarAluno } from '@/hooks/useGestaoCriarAluno';
import { useProfessorFichaAcoes } from '@/hooks/useProfessorFichaAcoes';
import { limparProfessorIdEmCache, useProfessorId } from '@/hooks/useProfessorId';
import { ProvedorPermissoesRecepcao, useRecepcaoPermissoes } from '@/hooks/useRecepcaoPermissoes';
import { duplicarFicha, publicarFicha } from '@/services/ficha.service';
import { aprovarAluno, criarGestaoAluno } from '@/services/gestaoAlunos.service';
import { criarPagamentoAvulso, estornarPagamento } from '@/services/pagamentos.service';
import { buscarPerfilProfessor, buscarPerfilRecepcao } from '@/services/usuario.service';
import { mostrarAlerta } from '@/utils/alerta';

jest.mock('@/hooks/useAuth');
jest.mock('@/services/gestaoAlunos.service');
jest.mock('@/services/ficha.service');
jest.mock('@/services/pagamentos.service');
jest.mock('@/services/matriculas.service');
jest.mock('@/services/usuario.service');
jest.mock('@/utils/alerta');

function erroApi(status: number, detail: string) {
  const erro = new AxiosError('falha');

  erro.response = { status, data: { detail } } as AxiosError['response'];

  return erro;
}

beforeEach(() => {
  jest.resetAllMocks();
  limparProfessorIdEmCache();
});

describe('useProfessorId (GR-04: cache por usuário)', () => {
  it('trocar de usuário busca o id de novo e nunca devolve o id do anterior', async () => {
    (buscarPerfilProfessor as jest.Mock)
      .mockResolvedValueOnce({ id: 11, nome: 'A', telefone: '1' })
      .mockResolvedValueOnce({ id: 22, nome: 'B', telefone: '2' });
    (useAuth as jest.Mock).mockReturnValue({ usuario: { id: 1, tipo: 'professor' } });

    const { result, rerender } = await renderHook(() => useProfessorId());

    await waitFor(() => expect(result.current).toBe(11));

    // Sai e entra outro professor na mesma sessão do navegador.
    (useAuth as jest.Mock).mockReturnValue({ usuario: null });
    await rerender({});
    expect(result.current).toBeNull();

    (useAuth as jest.Mock).mockReturnValue({ usuario: { id: 2, tipo: 'professor' } });
    await rerender({});
    expect(result.current).not.toBe(11);

    await waitFor(() => expect(result.current).toBe(22));
    expect(buscarPerfilProfessor).toHaveBeenCalledTimes(2);
  });

  it('reaproveita o id do mesmo usuário sem nova chamada e sem sessão devolve null', async () => {
    (buscarPerfilProfessor as jest.Mock).mockResolvedValue({ id: 11, nome: 'A', telefone: '1' });
    (useAuth as jest.Mock).mockReturnValue({ usuario: { id: 1, tipo: 'professor' } });

    const primeiro = await renderHook(() => useProfessorId());

    await waitFor(() => expect(primeiro.result.current).toBe(11));

    const segundo = await renderHook(() => useProfessorId());

    expect(segundo.result.current).toBe(11);
    expect(buscarPerfilProfessor).toHaveBeenCalledTimes(1);

    (useAuth as jest.Mock).mockReturnValue({ usuario: null });

    const semSessao = await renderHook(() => useProfessorId());

    expect(semSessao.result.current).toBeNull();
  });

  it('falha ao buscar o perfil deixa o id nulo (o backend decide as permissões)', async () => {
    (buscarPerfilProfessor as jest.Mock).mockRejectedValue(erroApi(500, 'x'));
    (useAuth as jest.Mock).mockReturnValue({ usuario: { id: 3, tipo: 'professor' } });

    const { result } = await renderHook(() => useProfessorId());

    await waitFor(() => expect(buscarPerfilProfessor).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });
});

describe('useProfessorFichaAcoes (GR-02)', () => {
  it('publicar devolve o detail da API no resultado, sem depender do próximo render', async () => {
    (publicarFicha as jest.Mock).mockRejectedValue(erroApi(409, 'Ficha sem treinos'));

    const { result } = await renderHook(() => useProfessorFichaAcoes());
    let resultado: Awaited<ReturnType<typeof result.current.publicar>> | undefined;

    await act(async () => {
      resultado = await result.current.publicar(7);
    });

    expect(resultado).toEqual({ ok: false, erro: 'Ficha sem treinos' });
    expect(result.current.erro).toBe('Ficha sem treinos');
  });

  it('publicar com sucesso devolve a versão; duplicar devolve null quando a API recusa', async () => {
    (publicarFicha as jest.Mock).mockResolvedValue({ numero: 3 });
    (duplicarFicha as jest.Mock).mockRejectedValue(erroApi(404, 'Aluno não encontrado'));

    const { result } = await renderHook(() => useProfessorFichaAcoes());

    await act(async () => {
      expect(await result.current.publicar(7)).toEqual({ ok: true, valor: { numero: 3 } });
      expect(await result.current.duplicar(7, { aluno_id: 9 })).toBeNull();
    });
    expect(result.current.erro).toBe('Aluno não encontrado');
  });
});

describe('useGestaoAprovacao (GR-06)', () => {
  it('confirma antes de aprovar, chama o service e recarrega', async () => {
    (aprovarAluno as jest.Mock).mockResolvedValue({});

    const aoConcluir = jest.fn();
    const { result } = await renderHook(() => useGestaoAprovacao(aoConcluir));

    await act(async () => result.current.aprovar({ id: 4, nome: 'Ana' }));

    expect(aprovarAluno).not.toHaveBeenCalled();

    const botoes = (mostrarAlerta as jest.Mock).mock.calls[0][2];

    await act(async () => botoes.find((b: { text: string }) => b.text === 'Aprovar').onPress());

    expect(aprovarAluno).toHaveBeenCalledWith(4);
    expect(aoConcluir).toHaveBeenCalled();
  });

  it('erro da API vira alerta com o detail e não recarrega', async () => {
    (aprovarAluno as jest.Mock).mockRejectedValue(erroApi(403, 'Permissão insuficiente'));

    const aoConcluir = jest.fn();
    const { result } = await renderHook(() => useGestaoAprovacao(aoConcluir));

    await act(async () => result.current.aprovar({ id: 4, nome: 'Ana' }));
    await act(async () => (mostrarAlerta as jest.Mock).mock.calls[0][2][1].onPress());

    expect(mostrarAlerta).toHaveBeenLastCalledWith('Erro', 'Permissão insuficiente');
    expect(aoConcluir).not.toHaveBeenCalled();
    expect(result.current.processando).toBeNull();
  });
});

describe('useGestaoAcoesFinanceiras (GR-06)', () => {
  it('devolve a mensagem do servidor sem recarregar quando o service rejeita', async () => {
    (estornarPagamento as jest.Mock).mockRejectedValue(erroApi(409, 'Pagamento já estornado'));

    const aoConcluir = jest.fn();
    const { result } = await renderHook(() => useGestaoAcoesFinanceiras(aoConcluir));
    let erro: string | null = 'x';

    await act(async () => {
      erro = await result.current.executarPagamento({ modo: 'estornar', dados: { motivo: 'erro' } } as never, 5);
    });

    expect(erro).toBe('Pagamento já estornado');
    expect(aoConcluir).not.toHaveBeenCalled();
    expect(result.current.executando).toBe(false);
  });

  it('sucesso devolve null e recarrega', async () => {
    (criarPagamentoAvulso as jest.Mock).mockResolvedValue({});

    const aoConcluir = jest.fn();
    const { result } = await renderHook(() => useGestaoAcoesFinanceiras(aoConcluir));
    let erro: string | null = 'x';

    await act(async () => {
      erro = await result.current.executarPagamento({ modo: 'avulso', dados: {} } as never);
    });

    expect(erro).toBeNull();
    expect(aoConcluir).toHaveBeenCalledTimes(1);
  });
});

describe('useGestaoCriarAluno (GR-03)', () => {
  it('devolve o aluno criado ou o erro da API', async () => {
    (criarGestaoAluno as jest.Mock)
      .mockResolvedValueOnce({ id: 1, nome: 'Ana' })
      .mockRejectedValueOnce(erroApi(409, 'E-mail já cadastrado'));

    const { result } = await renderHook(() => useGestaoCriarAluno());

    await act(async () => {
      expect(await result.current.criar({ professor_id: 3 } as never)).toEqual({ ok: true, valor: { id: 1, nome: 'Ana' } });
      expect(await result.current.criar({} as never)).toEqual({ ok: false, erro: 'E-mail já cadastrado' });
    });
    expect(criarGestaoAluno).toHaveBeenNthCalledWith(1, { professor_id: 3 });
  });
});

describe('ProvedorPermissoesRecepcao (GR-06)', () => {
  const envolver = ({ children }: { children: ReactNode }) => <ProvedorPermissoesRecepcao>{children}</ProvedorPermissoesRecepcao>;

  it('carrega o perfil e pode() só vale para as permissões recebidas', async () => {
    (buscarPerfilRecepcao as jest.Mock).mockResolvedValue({
      id: 1,
      nome: 'Rita',
      telefone: '1',
      permissoes: ['aprovar_aluno'],
    });

    const { result } = await renderHook(() => useRecepcaoPermissoes(), { wrapper: envolver });

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.pode('aprovar_aluno')).toBe(true);
    expect(result.current.pode('cadastrar_aluno')).toBe(false);
  });

  it('erro ao carregar mostra a mensagem, esconde tudo e permite tentar de novo', async () => {
    (buscarPerfilRecepcao as jest.Mock)
      .mockRejectedValueOnce(erroApi(500, 'Falha no servidor'))
      .mockResolvedValueOnce({ id: 1, nome: 'Rita', telefone: '1', permissoes: ['cadastrar_aluno'] });

    const { result } = await renderHook(() => useRecepcaoPermissoes(), { wrapper: envolver });

    await waitFor(() => expect(result.current.erro).toBe('Falha no servidor'));
    expect(result.current.pode('cadastrar_aluno')).toBe(false);

    await act(async () => result.current.recarregar());

    expect(result.current.erro).toBeNull();
    expect(result.current.pode('cadastrar_aluno')).toBe(true);
  });

  it('fora do provedor lança erro claro', async () => {
    const consoleErro = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(renderHook(() => useRecepcaoPermissoes())).rejects.toThrow('ProvedorPermissoesRecepcao');
    consoleErro.mockRestore();
  });
});
