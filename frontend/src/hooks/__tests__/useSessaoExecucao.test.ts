import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AxiosError } from 'axios';

import { useSessaoExecucao } from '@/hooks/useSessaoExecucao';
import { buscarFichaCompleta } from '@/services/fichaAluno.service';
import {
  buscarSessao,
  finalizarSessao,
  iniciarSessao,
  registrarExecucoes,
} from '@/services/sessao.service';
import { Execucao, SessaoResposta } from '@/types/sessao.types';

jest.mock('@/services/sessao.service');
jest.mock('@/services/fichaAluno.service');

const iniciar = iniciarSessao as jest.Mock;
const registrar = registrarExecucoes as jest.Mock;
const buscar = buscarSessao as jest.Mock;
const finalizarMock = finalizarSessao as jest.Mock;
const fichaCompleta = buscarFichaCompleta as jest.Mock;

function execucao(parcial: Partial<Execucao> = {}): Execucao {
  return {
    id: 1,
    sessao_id: 5,
    item_ficha_id: 1,
    exercicio_id: 1,
    exercicio_nome: 'Supino',
    data_execucao: '2026-10-30T08:00:00',
    series_realizadas: 1,
    repeticoes_realizadas: 12,
    carga_utilizada: 20,
    observacao: null,
    ...parcial,
  };
}

function sessao(execucoes: Execucao[] = []): SessaoResposta {
  return {
    id: 5,
    treino_id: 9,
    treino_nome: 'Treino A',
    ficha_id: 2,
    iniciada_em: '2026-10-30T08:00:00',
    finalizada_em: null,
    esforco: null,
    comentario: null,
    total_execucoes: execucoes.length,
    total_series: 0,
    volume_total: 0,
    duracao_segundos: null,
    execucoes,
  };
}

function erroDeRede() {
  return new AxiosError('Network Error', 'ERR_NETWORK');
}

function erroDeApi(status: number, detail: string) {
  const e = new AxiosError('falhou');
  e.response = { status, data: { detail } } as AxiosError['response'];

  return e;
}

const ficha = {
  treinos: [
    {
      id: 9,
      nome: 'Treino A',
      itens: [
        { id: 2, ordem: 2, series: 2, repeticoes: 8, carga: 10 },
        { id: 1, ordem: 1, series: 2, repeticoes: 12, carga: 20 },
      ],
    },
  ],
};

async function montar(execucoesIniciais: Execucao[] = []) {
  iniciar.mockResolvedValue(sessao(execucoesIniciais));
  fichaCompleta.mockResolvedValue(ficha);

  const hook = await renderHook(() => useSessaoExecucao(9));
  await waitFor(() => expect(hook.result.current.carregando).toBe(false));

  return hook;
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('useSessaoExecucao', () => {
  it('abre a sessão, ordena os itens e monta as séries pendentes', async () => {
    const { result } = await montar();

    expect(result.current.erro).toBeNull();
    expect(result.current.treinoNome).toBe('Treino A');
    expect(result.current.itens.map((i) => i.id)).toEqual([1, 2]);
    expect(result.current.totalSeries).toBe(4);
    expect(result.current.seriesFeitas).toBe(0);
  });

  it('expõe o início da sessão no servidor (base da duração do Resumo)', async () => {
    const { result } = await montar();

    expect(result.current.iniciadaEm).toBe('2026-10-30T08:00:00');
  });

  it('retomada: marca as séries que a sessão já tem gravadas', async () => {
    const { result } = await montar([execucao({ item_ficha_id: 1 })]);

    expect(result.current.series['1-0'].feita).toBe(true);
    expect(result.current.seriesFeitas).toBe(1);
  });

  it('treino que não pertence à ficha vira erro', async () => {
    iniciar.mockResolvedValue(sessao());
    fichaCompleta.mockResolvedValue({ treinos: [] });

    const { result } = await renderHook(() => useSessaoExecucao(9));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.erro).toBe('Treino não encontrado nesta ficha.');
  });

  it('concluir série grava 1 registro com os valores editados', async () => {
    registrar.mockResolvedValue([execucao()]);
    const { result } = await montar();

    await act(async () => result.current.editarSerie('1-0', 'carga', '22,5'));

    let gravou = false;
    await act(async () => {
      gravou = await result.current.concluirSerie('1-0');
    });

    expect(gravou).toBe(true);
    expect(registrar).toHaveBeenCalledWith(5, [
      {
        item_ficha_id: 1,
        series_realizadas: 1,
        repeticoes_realizadas: 12,
        carga_utilizada: 22.5,
      },
    ]);
    expect(result.current.series['1-0'].feita).toBe(true);
    expect(result.current.seriesFeitas).toBe(1);
    expect(result.current.enviando).toBeNull();
  });

  it('valor inválido não chama a API e mostra erro', async () => {
    const { result } = await montar();

    await act(async () => result.current.editarSerie('1-0', 'repeticoes', 'abc'));
    await act(async () => {
      await result.current.concluirSerie('1-0');
    });

    expect(registrar).not.toHaveBeenCalled();
    expect(result.current.erroAcao).toBe('Informe repetições e carga válidas.');
  });

  it('duplo toque: o segundo toque durante o envio é ignorado', async () => {
    let resolver!: (v: Execucao[]) => void;
    registrar.mockReturnValue(new Promise<Execucao[]>((r) => (resolver = r)));
    const { result } = await montar();

    let primeiro!: Promise<boolean>;
    let segundo!: boolean;

    await act(async () => {
      primeiro = result.current.concluirSerie('1-0');
      segundo = await result.current.concluirSerie('1-0');
    });

    expect(segundo).toBe(false);
    expect(registrar).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolver([execucao()]);
      await primeiro;
    });

    expect(result.current.series['1-0'].feita).toBe(true);
  });

  it('série já feita não é enviada de novo', async () => {
    registrar.mockResolvedValue([execucao()]);
    const { result } = await montar();

    await act(async () => {
      await result.current.concluirSerie('1-0');
    });
    await act(async () => {
      expect(await result.current.concluirSerie('1-0')).toBe(false);
    });

    expect(registrar).toHaveBeenCalledTimes(1);
  });

  it('erro da API (ex.: 409) mostra o detail e não marca como feita', async () => {
    registrar.mockRejectedValue(erroDeApi(409, 'Sessão já finalizada'));
    const { result } = await montar();

    await act(async () => {
      expect(await result.current.concluirSerie('1-0')).toBe(false);
    });

    expect(result.current.erroAcao).toBe('Sessão já finalizada');
    expect(result.current.series['1-0'].feita).toBe(false);
    expect(buscar).not.toHaveBeenCalled();
  });

  it('falha de rede, mas o servidor gravou: reconcilia e marca como feita', async () => {
    registrar.mockRejectedValue(erroDeRede());
    buscar.mockResolvedValue(sessao([execucao({ item_ficha_id: 1 })]));
    const { result } = await montar();

    await act(async () => {
      expect(await result.current.concluirSerie('1-0')).toBe(true);
    });

    expect(buscar).toHaveBeenCalledWith(5);
    expect(result.current.series['1-0'].feita).toBe(true);
    expect(result.current.erroAcao).toBeNull();
  });

  it('falha de rede e o servidor NÃO gravou: avisa e permite tentar de novo', async () => {
    registrar.mockRejectedValueOnce(erroDeRede());
    buscar.mockResolvedValueOnce(sessao());
    const { result } = await montar();

    await act(async () => {
      expect(await result.current.concluirSerie('1-0')).toBe(false);
    });

    expect(result.current.erroAcao).toBe(
      'Sem conexão. Verifique a internet e tente de novo.'
    );
    expect(result.current.series['1-0'].feita).toBe(false);

    // Segunda tentativa: a reconciliação já confirmou que nada foi gravado,
    // então reenvia direto.
    registrar.mockResolvedValueOnce([execucao()]);

    await act(async () => {
      expect(await result.current.concluirSerie('1-0')).toBe(true);
    });

    expect(buscar).toHaveBeenCalledTimes(1);
    expect(registrar).toHaveBeenCalledTimes(2);
    expect(result.current.series['1-0'].feita).toBe(true);
  });

  it('rede cai também na reconciliação: não marca como feita', async () => {
    registrar.mockRejectedValue(erroDeRede());
    buscar.mockRejectedValue(erroDeRede());
    const { result } = await montar();

    await act(async () => {
      expect(await result.current.concluirSerie('1-0')).toBe(false);
    });

    expect(result.current.erroAcao).toBe(
      'Sem conexão. Não foi possível confirmar a série; tente de novo.'
    );
    expect(result.current.series['1-0'].feita).toBe(false);
  });

  it('o reenvio não duplica quando o servidor já gravou a série anterior', async () => {
    // 1ª tentativa: rede cai e a reconciliação também; o servidor gravou.
    registrar.mockRejectedValueOnce(erroDeRede());
    buscar.mockRejectedValueOnce(erroDeRede());
    const { result } = await montar();

    await act(async () => {
      await result.current.concluirSerie('1-0');
    });
    expect(result.current.series['1-0'].feita).toBe(false);

    // 2ª tentativa: reconcilia primeiro, vê o registro e NÃO reenvia.
    buscar.mockResolvedValueOnce(sessao([execucao({ item_ficha_id: 1 })]));

    await act(async () => {
      expect(await result.current.concluirSerie('1-0')).toBe(true);
    });

    expect(registrar).toHaveBeenCalledTimes(1);
    expect(result.current.series['1-0'].feita).toBe(true);
  });

  it('finalizar envia esforço e comentário aparado; vazio vira undefined', async () => {
    finalizarMock.mockResolvedValue(sessao());
    const { result } = await montar();

    await act(async () => {
      expect(await result.current.finalizar(8, '  ótimo  ')).toBe(true);
    });
    await act(async () => {
      await result.current.finalizar(undefined, '   ');
    });

    expect(finalizarMock).toHaveBeenNthCalledWith(1, 5, {
      esforco: 8,
      comentario: 'ótimo',
    });
    expect(finalizarMock).toHaveBeenNthCalledWith(2, 5, {
      esforco: undefined,
      comentario: undefined,
    });
  });

  it('finalizar com erro devolve false e mostra a mensagem', async () => {
    finalizarMock.mockRejectedValue(erroDeApi(409, 'Sessão já finalizada'));
    const { result } = await montar();

    await act(async () => {
      expect(await result.current.finalizar(5, '')).toBe(false);
    });

    expect(result.current.erroAcao).toBe('Sessão já finalizada');
    expect(result.current.finalizando).toBe(false);
  });
});
