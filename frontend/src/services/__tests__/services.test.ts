import { AxiosError } from 'axios';

import { api } from '@/services/api';
import * as auth from '@/services/auth.service';
import * as avaliacao from '@/services/avaliacao.service';
import * as evolucao from '@/services/evolucao.service';
import * as ficha from '@/services/ficha.service';
import * as fichaAluno from '@/services/fichaAluno.service';
import * as sessao from '@/services/sessao.service';
import * as treino from '@/services/treino.service';
import * as usuario from '@/services/usuario.service';
import { AvaliacaoCriar } from '@/types/avaliacao.types';

jest.mock('@/services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const http = api as unknown as {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  delete: jest.Mock;
};

function erro404() {
  const e = new AxiosError('não encontrado');
  e.response = { status: 404, data: {} } as AxiosError['response'];

  return e;
}

beforeEach(() => {
  jest.resetAllMocks();
  http.get.mockResolvedValue({ data: 'GET' });
  http.post.mockResolvedValue({ data: 'POST' });
  http.put.mockResolvedValue({ data: 'PUT' });
  http.delete.mockResolvedValue({ data: undefined });
});

describe('auth.service', () => {
  it('login: POST /login e devolve o corpo', async () => {
    const dados = { email: 'a@b.com', senha: '123' };

    await expect(auth.login(dados as never)).resolves.toBe('POST');
    expect(http.post).toHaveBeenCalledWith('/login', dados, { timeout: 15000 });
  });

  it('cadastro: POST /cadastro', async () => {
    const dados = { nome: 'Ana' };

    await auth.cadastro(dados as never);
    expect(http.post).toHaveBeenCalledWith('/cadastro', dados);
  });
});

describe('usuario.service', () => {
  it('leituras de perfil usam GET', async () => {
    await usuario.buscarUsuario();
    await usuario.buscarPerfilAluno();
    await usuario.buscarPerfilProfessor();

    expect(http.get.mock.calls.map((c) => c[0])).toEqual([
      '/perfil',
      '/perfil/aluno',
      '/perfil/professor',
    ]);
  });

  it('atualizações usam PUT nos paths do perfil', async () => {
    await usuario.atualizarPerfilAluno({} as never);
    await usuario.atualizarPerfilProfessor({} as never);
    await usuario.alterarEmail({ email: 'x@y.com' } as never);
    await usuario.alterarSenha({ senha_atual: 'a', nova_senha: 'b' } as never);

    expect(http.put.mock.calls.map((c) => c[0])).toEqual([
      '/perfil/aluno',
      '/perfil/professor',
      '/perfil/email',
      '/perfil/senha',
    ]);
    expect(http.put.mock.calls[3][1]).toEqual({
      senha_atual: 'a',
      nova_senha: 'b',
    });
  });

  it('foto: PUT /perfil/foto multipart com o campo `arquivo`; DELETE remove', async () => {
    await usuario.enviarFotoPerfil({
      uri: 'file:///f.jpg',
      name: 'f.jpg',
      type: 'image/jpeg',
    });

    const [path, formulario, config] = http.put.mock.calls[0];
    expect(path).toBe('/perfil/foto');
    expect(formulario).toBeInstanceOf(FormData);
    expect(config.headers['Content-Type']).toBe('multipart/form-data');

    await usuario.removerFotoPerfil();
    expect(http.delete).toHaveBeenCalledWith('/perfil/foto');
  });
});

describe('ficha.service', () => {
  it('buscarFichas: GET /ficha com e sem aluno_id', async () => {
    await ficha.buscarFichas();
    await ficha.buscarFichas(7);

    expect(http.get).toHaveBeenNthCalledWith(1, '/ficha', { params: undefined });
    expect(http.get).toHaveBeenNthCalledWith(2, '/ficha', {
      params: { aluno_id: 7 },
    });
  });

  it('buscar/criar/atualizar/excluir ficha', async () => {
    await ficha.buscarFicha(3);
    await ficha.criarFicha({ nome: 'A' } as never);
    await ficha.atualizarFicha(3, { nome: 'B' } as never);
    await ficha.deletarFicha(3);

    expect(http.get).toHaveBeenCalledWith('/ficha/professor/3');
    expect(http.post).toHaveBeenCalledWith('/ficha', { nome: 'A' });
    expect(http.put).toHaveBeenCalledWith('/ficha/3', { nome: 'B' });
    expect(http.delete).toHaveBeenCalledWith('/ficha/3');
  });

  it('itens: POST /ficha/itens, PUT/DELETE /ficha/item/{id}', async () => {
    await ficha.criarItemFicha({ treino_id: 1 } as never);
    await ficha.atualizarItemFicha(9, { series: 4 } as never);
    await ficha.deletarItemFicha(9);

    expect(http.post).toHaveBeenCalledWith('/ficha/itens', { treino_id: 1 });
    expect(http.put).toHaveBeenCalledWith('/ficha/item/9', { series: 4 });
    expect(http.delete).toHaveBeenCalledWith('/ficha/item/9');
  });

  it('buscarItensTreino: GET e 404 vira lista vazia; outros erros propagam', async () => {
    await ficha.buscarItensTreino(5);
    expect(http.get).toHaveBeenCalledWith('/ficha/itens/treino/5');

    http.get.mockRejectedValueOnce(erro404());
    await expect(ficha.buscarItensTreino(5)).resolves.toEqual([]);

    http.get.mockRejectedValueOnce(new Error('rede'));
    await expect(ficha.buscarItensTreino(5)).rejects.toThrow('rede');
  });
});

describe('treino.service', () => {
  it('CRUD de treino', async () => {
    await treino.buscarTreinos(2);
    await treino.criarTreino({ nome: 'A' } as never);
    await treino.atualizarTreino(4, { nome: 'B' } as never);
    await treino.deletarTreino(4);

    expect(http.get).toHaveBeenCalledWith('/treino/ficha/2');
    expect(http.post).toHaveBeenCalledWith('/treino', { nome: 'A' });
    expect(http.put).toHaveBeenCalledWith('/treino/4', { nome: 'B' });
    expect(http.delete).toHaveBeenCalledWith('/treino/4');
  });

  it('buscarTreinos: 404 vira lista vazia; outros erros propagam', async () => {
    http.get.mockRejectedValueOnce(erro404());
    await expect(treino.buscarTreinos(2)).resolves.toEqual([]);

    http.get.mockRejectedValueOnce(new Error('rede'));
    await expect(treino.buscarTreinos(2)).rejects.toThrow('rede');
  });

  it('reordenarItensTreino: PUT /treino/{id}/itens/ordem com {itens} (ADR-028)', async () => {
    const itens = [
      { id: 10, ordem: 2 },
      { id: 20, ordem: 1 },
    ];

    await expect(treino.reordenarItensTreino(6, itens)).resolves.toBe('PUT');
    expect(http.put).toHaveBeenCalledTimes(1);
    expect(http.put).toHaveBeenCalledWith('/treino/6/itens/ordem', { itens });
  });
});

describe('sessao.service', () => {
  it('iniciar: POST /sessoes {treino_id}', async () => {
    await sessao.iniciarSessao(8);
    expect(http.post).toHaveBeenCalledWith('/sessoes', { treino_id: 8 });
  });

  it('registrarExecucoes: POST /sessoes/{id}/execucoes {execucoes}', async () => {
    const execucoes = [
      {
        item_ficha_id: 1,
        series_realizadas: 1,
        repeticoes_realizadas: 10,
        carga_utilizada: 20,
      },
    ];

    await sessao.registrarExecucoes(3, execucoes);
    expect(http.post).toHaveBeenCalledWith('/sessoes/3/execucoes', {
      execucoes,
    });
  });

  it('finalizar: POST /sessoes/{id}/finalizar', async () => {
    await sessao.finalizarSessao(3, { esforco: 7, comentario: 'ok' });
    expect(http.post).toHaveBeenCalledWith('/sessoes/3/finalizar', {
      esforco: 7,
      comentario: 'ok',
    });
  });

  it('listar e buscar: GET /sessoes e /sessoes/{id}', async () => {
    await sessao.listarMinhasSessoes();
    await sessao.buscarSessao(3);

    expect(http.get.mock.calls.map((c) => c[0])).toEqual([
      '/sessoes',
      '/sessoes/3',
    ]);
  });

  it('listar paginado: GET /sessoes com limite e deslocamento', async () => {
    http.get.mockClear();

    await sessao.listarMinhasSessoes({ limite: 20, deslocamento: 40 });

    expect(http.get).toHaveBeenCalledWith('/sessoes', {
      params: { limite: 20, deslocamento: 40 },
    });
  });
});

describe('evolucao.service', () => {
  it('aluno: /evolucao/exercicios[/{id}]', async () => {
    await evolucao.listarMinhaEvolucao();
    await evolucao.buscarMinhaEvolucao(5);

    expect(http.get.mock.calls.map((c) => c[0])).toEqual([
      '/evolucao/exercicios',
      '/evolucao/exercicios/5',
    ]);
  });

  it('professor: /alunos/{aluno}/evolucao/exercicios[/{id}]', async () => {
    await evolucao.listarEvolucaoDoAluno(2);
    await evolucao.buscarEvolucaoDoAluno(2, 5);

    expect(http.get.mock.calls.map((c) => c[0])).toEqual([
      '/alunos/2/evolucao/exercicios',
      '/alunos/2/evolucao/exercicios/5',
    ]);
  });
});

describe('avaliacao.service', () => {
  const dados: AvaliacaoCriar = {
    data_avaliacao: '2026-10-30T00:00:00',
    peso: 80,
    altura: 1.8,
  };

  it('professor cria e lista: POST/GET /alunos/{id}/avaliacoes', async () => {
    await avaliacao.criarAvaliacao(2, dados);
    await avaliacao.listarAvaliacoesAluno(2);

    expect(http.post).toHaveBeenCalledWith('/alunos/2/avaliacoes', dados);
    expect(http.get).toHaveBeenCalledWith('/alunos/2/avaliacoes');
  });

  it('aluno lista as próprias: GET /avaliacoes', async () => {
    await avaliacao.listarMinhasAvaliacoes();
    expect(http.get).toHaveBeenCalledWith('/avaliacoes');
  });

  it('PUT e DELETE /avaliacoes/{id}', async () => {
    await avaliacao.atualizarAvaliacao(4, dados);
    await avaliacao.excluirAvaliacao(4);

    expect(http.put).toHaveBeenCalledWith('/avaliacoes/4', dados);
    expect(http.delete).toHaveBeenCalledWith('/avaliacoes/4');
  });
});

describe('fichaAluno.service', () => {
  it('GET /ficha/aluno, /ficha/{id} e /treino/hoje/{id}', async () => {
    await fichaAluno.listarMinhasFichas();
    await fichaAluno.buscarFichaCompleta(3);
    await fichaAluno.buscarTreinosDeHoje(3);

    expect(http.get.mock.calls.map((c) => c[0])).toEqual([
      '/ficha/aluno',
      '/ficha/3',
      '/treino/hoje/3',
    ]);
  });
});
