import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AxiosError } from 'axios';

import { useAlunoDetalhe } from '@/hooks/useAlunoDetalhe';
import { buscarAluno, listarSessoesDoAluno } from '@/services/aluno.service';
import { listarAvaliacoesAluno } from '@/services/avaliacao.service';
import { listarEvolucaoDoAluno } from '@/services/evolucao.service';
import { buscarFichas } from '@/services/ficha.service';

jest.mock('@/services/aluno.service');
jest.mock('@/services/avaliacao.service');
jest.mock('@/services/evolucao.service');
jest.mock('@/services/ficha.service');

const falha = () => Promise.reject(new AxiosError('Network Error'));

describe('useAlunoDetalhe', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (buscarAluno as jest.Mock).mockResolvedValue({ id: 1, nome: 'Ana' });
    (buscarFichas as jest.Mock).mockResolvedValue([]);
    (listarEvolucaoDoAluno as jest.Mock).mockResolvedValue([]);
    (listarAvaliacoesAluno as jest.Mock).mockResolvedValue([]);
  });

  it('uma seção com erro não derruba as outras e recarrega só ela', async () => {
    (listarSessoesDoAluno as jest.Mock).mockImplementationOnce(falha);

    const { result } = await renderHook(() => useAlunoDetalhe(1));

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.aluno?.nome).toBe('Ana');
    expect(result.current.sessoes.erro).toBe('Erro ao carregar sessões.');
    expect(result.current.fichas.erro).toBeNull();
    expect(result.current.avaliacoes.erro).toBeNull();

    (listarSessoesDoAluno as jest.Mock).mockResolvedValueOnce([{ id: 7 }]);

    await act(async () => {
      await result.current.sessoes.recarregar();
    });

    expect(result.current.sessoes.erro).toBeNull();
    expect(result.current.sessoes.dados).toEqual([{ id: 7 }]);
    expect(result.current.sessoes.carregando).toBe(false);

    // Só a seção de sessões foi buscada de novo.
    expect(listarSessoesDoAluno).toHaveBeenCalledTimes(2);
    expect(buscarFichas).toHaveBeenCalledTimes(1);
    expect(listarEvolucaoDoAluno).toHaveBeenCalledTimes(1);
    expect(listarAvaliacoesAluno).toHaveBeenCalledTimes(1);
    expect(buscarAluno).toHaveBeenCalledTimes(1);
  });

  it('a recarga que falha de novo mantém o erro da seção', async () => {
    (listarSessoesDoAluno as jest.Mock).mockImplementation(falha);

    const { result } = await renderHook(() => useAlunoDetalhe(1));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    await act(async () => {
      await result.current.sessoes.recarregar();
    });

    expect(result.current.sessoes.erro).toBe('Erro ao carregar sessões.');
    expect(result.current.sessoes.carregando).toBe(false);
  });
});
