import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AxiosError } from 'axios';

import { useMontadorFicha } from '@/hooks/useMontadorFicha';
import {
  buscarFichaCompleta,
  criarFicha,
  publicarFicha,
  salvarFichaCompleta,
} from '@/services/ficha.service';
import { Exercicio } from '@/types/exercicio.types';
import { FichaCompleta } from '@/types/ficha.types';

jest.mock('@/services/ficha.service');

const supino: Exercicio = {
  id: 10,
  nome: 'Supino reto',
  descricao: 'Peito',
  grupo_muscular: 'Peito',
  imagem: null,
  video: null,
};
const remada: Exercicio = { ...supino, id: 11, nome: 'Remada curvada', grupo_muscular: 'Costas' };
const agacho: Exercicio = { ...supino, id: 12, nome: 'Agachamento', grupo_muscular: 'Pernas' };

function item(id: number, treino: number, exercicio: number, ordem: number, nome: string) {
  return {
    id,
    ficha_id: 50,
    treino_id: treino,
    exercicio_id: exercicio,
    series: 3,
    repeticoes: 12,
    carga: 0,
    descanso: 60,
    ordem,
    nome,
    descricao: '',
    grupo_muscular: 'x',
    imagem: null,
    video: null,
  };
}

/** Ficha como o servidor a devolve depois de salvar: A (supino, remada) e B (agachamento). */
const salva: FichaCompleta = {
  id: 50,
  nome: 'Hipertrofia',
  data_criacao: '2026-11-10T10:00:00-03:00',
  data_inicio: '2026-11-10',
  data_fim: null,
  vigente: true,
  aluno_id: 5,
  status: 'rascunho',
  objetivo: null,
  treinos: [
    {
      id: 500,
      ficha_id: 50,
      nome: 'Treino A',
      dia_semana: null,
      ordem: 1,
      total_itens: 2,
      itens: [item(5000, 500, 10, 1, 'Supino reto'), item(5001, 500, 11, 2, 'Remada curvada')],
    },
    {
      id: 501,
      ficha_id: 50,
      nome: 'Treino B',
      dia_semana: 'quarta',
      ordem: 2,
      total_itens: 1,
      itens: [item(5002, 501, 12, 1, 'Agachamento')],
    },
  ],
};

async function preencherNova(result: { current: ReturnType<typeof useMontadorFicha> }) {
  await act(() => {
    result.current.definirCampos({ nome: 'Hipertrofia' });
    result.current.adicionarExercicio(0, supino);
    result.current.adicionarExercicio(0, remada);
    result.current.adicionarDivisao();
    result.current.atualizarDivisao(1, { dia: 'quarta' });
    result.current.adicionarExercicio(1, agacho);
  });
}

function erroApi(status: number, detail: string) {
  return Object.assign(new AxiosError('x'), { response: { status, data: { detail } } });
}

type ItemPayload = { id?: number; ordem: number };

describe('useMontadorFicha', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (criarFicha as jest.Mock).mockResolvedValue({ id: 50 });
    (salvarFichaCompleta as jest.Mock).mockResolvedValue(salva);
    (buscarFichaCompleta as jest.Mock).mockResolvedValue(salva);
    (publicarFicha as jest.Mock).mockResolvedValue({ numero: 1, publicada_em: 'x', publicada_por: null });
  });

  it('começa vazio e limpo, com o aluno pré-selecionado', async () => {
    const { result } = await renderHook(() => useMontadorFicha({ alunoIdInicial: 5 }));

    expect(result.current.ficha.alunoId).toBe(5);
    expect(result.current.ficha.divisoes).toHaveLength(1);
    expect(result.current.alterado).toBe(false);
    expect(result.current.carregando).toBe(false);

    await act(() => result.current.definirCampos({ nome: 'Plano' }));

    expect(result.current.alterado).toBe(true);
  });

  it('salvar rascunho cria o rascunho e grava todo o conteúdo numa única chamada', async () => {
    const { result } = await renderHook(() => useMontadorFicha({ alunoIdInicial: 5 }));

    await preencherNova(result);

    let resposta: Awaited<ReturnType<typeof result.current.salvarRascunho>> | undefined;

    await act(async () => {
      resposta = await result.current.salvarRascunho();
    });

    expect(resposta).toEqual({ ok: true, fichaId: 50, versao: undefined });
    expect(criarFicha).toHaveBeenCalledWith({
      aluno_id: 5,
      status: 'rascunho',
      nome: 'Hipertrofia',
      objetivo: null,
      data_fim: null,
    });
    expect(salvarFichaCompleta).toHaveBeenCalledTimes(1);

    const [id, payload] = (salvarFichaCompleta as jest.Mock).mock.calls[0];

    expect(id).toBe(50);
    expect(payload).toMatchObject({ nome: 'Hipertrofia', objetivo: null, data_fim: null });
    expect(payload.treinos).toEqual([
      {
        nome: 'Treino A',
        dia_semana: null,
        ordem: 1,
        itens: [
          { exercicio_id: 10, ordem: 1, series: 3, repeticoes: 12, carga: 0, descanso: 60, observacao: null },
          { exercicio_id: 11, ordem: 2, series: 3, repeticoes: 12, carga: 0, descanso: 60, observacao: null },
        ],
      },
      {
        nome: 'Treino B',
        dia_semana: 'quarta',
        ordem: 2,
        itens: [
          { exercicio_id: 12, ordem: 1, series: 3, repeticoes: 12, carga: 0, descanso: 60, observacao: null },
        ],
      },
    ]);
    expect(publicarFicha).not.toHaveBeenCalled();
    // após salvar, o estado vem do servidor (com ids) e não há alterações pendentes
    expect(result.current.ficha.id).toBe(50);
    expect(result.current.ficha.divisoes[0].itens[0].id).toBe(5000);
    expect(result.current.alterado).toBe(false);
    expect(result.current.salvando).toBe(false);
  });

  it('não chama a API quando a validação falha e devolve invalido', async () => {
    const { result } = await renderHook(() => useMontadorFicha({ alunoIdInicial: null }));

    let resposta: Awaited<ReturnType<typeof result.current.salvarRascunho>> | undefined;

    await act(async () => {
      resposta = await result.current.salvarRascunho();
    });

    expect(resposta).toMatchObject({ ok: false, invalido: true });
    expect(criarFicha).not.toHaveBeenCalled();
    expect(salvarFichaCompleta).not.toHaveBeenCalled();
    expect(result.current.erros.aluno).toBe('Selecione o aluno.');
    expect(result.current.erros.nome).toBe('Informe o nome da ficha.');
  });

  it('publicar salva e publica, devolvendo o número da versão criada', async () => {
    const { result } = await renderHook(() => useMontadorFicha({ alunoIdInicial: 5 }));

    await preencherNova(result);

    let resposta: Awaited<ReturnType<typeof result.current.publicar>> | undefined;

    await act(async () => {
      resposta = await result.current.publicar();
    });

    expect(resposta).toEqual({ ok: true, fichaId: 50, versao: 1 });
    expect(publicarFicha).toHaveBeenCalledWith(50);
    expect(result.current.ultimaVersao).toBe(1);
  });

  it('publicar sem exercícios é recusado antes de chamar a API', async () => {
    const { result } = await renderHook(() => useMontadorFicha({ alunoIdInicial: 5 }));

    await act(() => result.current.definirCampos({ nome: 'Vazia' }));

    let resposta: Awaited<ReturnType<typeof result.current.publicar>> | undefined;

    await act(async () => {
      resposta = await result.current.publicar();
    });

    expect(resposta).toMatchObject({ ok: false, invalido: true });
    expect(criarFicha).not.toHaveBeenCalled();
    expect(publicarFicha).not.toHaveBeenCalled();
  });

  it('erro ao criar: devolve a mensagem da API e mantém o que foi digitado', async () => {
    (criarFicha as jest.Mock).mockRejectedValue(erroApi(403, 'Aluno não vinculado a você'));

    const { result } = await renderHook(() => useMontadorFicha({ alunoIdInicial: 5 }));

    await preencherNova(result);

    let resposta: Awaited<ReturnType<typeof result.current.salvarRascunho>> | undefined;

    await act(async () => {
      resposta = await result.current.salvarRascunho();
    });

    expect(resposta).toEqual({ ok: false, erro: 'Aluno não vinculado a você' });
    expect(salvarFichaCompleta).not.toHaveBeenCalled();
    expect(result.current.ficha.nome).toBe('Hipertrofia');
    expect(totalItens(result.current.ficha)).toBe(3);
    expect(result.current.alterado).toBe(true);
    expect(result.current.salvando).toBe(false);
  });

  it('erro do backend no conteúdo: mensagem na tela, digitação intacta e nova tentativa sem duplicar o rascunho', async () => {
    (salvarFichaCompleta as jest.Mock)
      .mockRejectedValueOnce(erroApi(404, 'Exercicio não encontrado'))
      .mockResolvedValueOnce(salva);

    const { result } = await renderHook(() => useMontadorFicha({ alunoIdInicial: 5 }));

    await preencherNova(result);

    let resposta: Awaited<ReturnType<typeof result.current.salvarRascunho>> | undefined;

    await act(async () => {
      resposta = await result.current.salvarRascunho();
    });

    expect(resposta).toEqual({ ok: false, erro: 'Exercicio não encontrado' });
    expect(result.current.ficha.nome).toBe('Hipertrofia');
    expect(totalItens(result.current.ficha)).toBe(3);
    expect(result.current.ficha.id).toBe(50);
    expect(result.current.alterado).toBe(true);
    expect(result.current.salvando).toBe(false);

    await act(async () => {
      const r = await result.current.salvarRascunho();

      expect(r).toMatchObject({ ok: true, fichaId: 50 });
    });

    expect(criarFicha).toHaveBeenCalledTimes(1);
    expect(salvarFichaCompleta).toHaveBeenCalledTimes(2);
    expect(result.current.alterado).toBe(false);
  });

  describe('edição de ficha existente', () => {
    async function carregada(status: 'rascunho' | 'publicada' = 'publicada') {
      (buscarFichaCompleta as jest.Mock).mockResolvedValue({ ...salva, status });

      const hook = await renderHook(() => useMontadorFicha({ fichaId: 50 }));

      await waitFor(() => expect(hook.result.current.carregando).toBe(false));

      return hook;
    }

    it('carrega a ficha completa e fica limpo', async () => {
      const { result } = await carregada();

      expect(result.current.ficha).toMatchObject({ id: 50, status: 'publicada', alunoId: 5 });
      expect(result.current.ficha.divisoes[1].dia).toBe('quarta');
      expect(result.current.alterado).toBe(false);
    });

    it('mostra o erro de carga e permite tentar de novo', async () => {
      (buscarFichaCompleta as jest.Mock)
        .mockRejectedValueOnce(new AxiosError('Network Error'))
        .mockResolvedValueOnce(salva);

      const { result } = await renderHook(() => useMontadorFicha({ fichaId: 50 }));

      await waitFor(() => expect(result.current.erroCarga).not.toBeNull());

      await act(async () => {
        await result.current.recarregar();
      });

      expect(result.current.erroCarga).toBeNull();
      expect(result.current.ficha.id).toBe(50);
    });

    it('envia o estado completo numa chamada: item editado, movido, novo e divisão removida', async () => {
      const { result } = await carregada();

      await act(() => {
        result.current.atualizarItem(0, 0, { series: '5' }); // supino editado
        result.current.moverItem(0, 0, 1); // remada sobe para a posição 1
        result.current.adicionarExercicio(0, agacho); // novo item na posição 3
        result.current.removerDivisao(1); // remove o treino B
      });

      await act(async () => {
        const r = await result.current.salvarRascunho();

        expect(r).toMatchObject({ ok: true, fichaId: 50 });
      });

      expect(criarFicha).not.toHaveBeenCalled();
      expect(salvarFichaCompleta).toHaveBeenCalledTimes(1);

      const [id, payload] = (salvarFichaCompleta as jest.Mock).mock.calls[0];

      expect(id).toBe(50);
      expect(payload.treinos).toHaveLength(1);
      expect(payload.treinos[0]).toMatchObject({ id: 500, ordem: 1 });
      expect(payload.treinos[0].itens).toEqual([
        expect.objectContaining({ id: 5001, exercicio_id: 11, ordem: 1 }),
        expect.objectContaining({ id: 5000, exercicio_id: 10, ordem: 2, series: 5 }),
        expect.objectContaining({ exercicio_id: 12, ordem: 3 }),
      ]);
      expect(payload.treinos[0].itens[2]).not.toHaveProperty('id');
    });

    it('duplicar e remover itens também vão no mesmo estado completo', async () => {
      const { result } = await carregada();

      await act(() => {
        result.current.duplicarItem(0, 0);
        result.current.removerItem(1, 0);
      });

      await act(async () => {
        await result.current.salvarRascunho();
      });

      const payload = (salvarFichaCompleta as jest.Mock).mock.calls[0][1];

      expect(payload.treinos[0].itens.map((i: ItemPayload) => [i.id, i.ordem])).toEqual([
        [5000, 1],
        [undefined, 2],
        [5001, 3],
      ]);
      expect(payload.treinos[1].itens).toEqual([]);
    });

    it('erro ao salvar ficha existente: mensagem do servidor e digitação mantida', async () => {
      (salvarFichaCompleta as jest.Mock).mockRejectedValue(
        erroApi(403, 'Você não tem permissão para alterar esta ficha de treino')
      );

      const { result } = await carregada();

      await act(() => result.current.definirCampos({ nome: 'Digitado' }));

      let resposta: Awaited<ReturnType<typeof result.current.salvarRascunho>> | undefined;

      await act(async () => {
        resposta = await result.current.salvarRascunho();
      });

      expect(resposta).toEqual({
        ok: false,
        erro: 'Você não tem permissão para alterar esta ficha de treino',
      });
      expect(result.current.ficha.nome).toBe('Digitado');
      expect(result.current.alterado).toBe(true);
      expect(result.current.salvando).toBe(false);
    });

    it('publicar uma ficha já publicada cria a versão seguinte', async () => {
      (publicarFicha as jest.Mock).mockResolvedValue({ numero: 2, publicada_em: 'x', publicada_por: null });

      const { result } = await carregada();

      await act(() => result.current.definirCampos({ objetivo: 'Força' }));

      let resposta: Awaited<ReturnType<typeof result.current.publicar>> | undefined;

      await act(async () => {
        resposta = await result.current.publicar();
      });

      expect(resposta).toEqual({ ok: true, fichaId: 50, versao: 2 });
      expect(salvarFichaCompleta).toHaveBeenCalledWith(50, expect.objectContaining({ objetivo: 'Força' }));
    });

    it('falha ao publicar depois de salvar: avisa que a ficha foi salva', async () => {
      (publicarFicha as jest.Mock).mockRejectedValue(erroApi(403, 'Sem permissão'));

      const { result } = await carregada();

      await act(() => result.current.definirCampos({ nome: 'Novo nome' }));

      let resposta: Awaited<ReturnType<typeof result.current.publicar>> | undefined;

      await act(async () => {
        resposta = await result.current.publicar();
      });

      expect(resposta).toMatchObject({ ok: false });
      expect((resposta as { erro: string }).erro).toMatch(/Ficha salva, mas não foi possível publicar: Sem permissão/);
      expect(salvarFichaCompleta).toHaveBeenCalled();
    });
  });
});

function totalItens(ficha: { divisoes: { itens: unknown[] }[] }) {
  return ficha.divisoes.reduce((soma, d) => soma + d.itens.length, 0);
}
