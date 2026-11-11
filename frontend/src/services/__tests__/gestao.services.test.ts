import { api } from '@/services/api';
import * as acessos from '@/services/acessos.service';
import * as auditoria from '@/services/auditoria.service';
import * as configuracao from '@/services/configuracao.service';
import * as equipe from '@/services/equipe.service';
import * as exercicio from '@/services/exercicio.service';
import * as ficha from '@/services/ficha.service';
import * as gestaoAlunos from '@/services/gestaoAlunos.service';
import * as matriculas from '@/services/matriculas.service';
import * as pagamentos from '@/services/pagamentos.service';
import * as paineis from '@/services/paineis.service';
import * as planos from '@/services/planos.service';

jest.mock('@/services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const http = api as unknown as {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  delete: jest.Mock;
};

beforeEach(() => {
  jest.resetAllMocks();
  http.get.mockResolvedValue({ data: 'GET' });
  http.post.mockResolvedValue({ data: 'POST' });
  http.put.mockResolvedValue({ data: 'PUT' });
});

describe('limparParametros', () => {
  it('remove undefined e null, mantém 0 e false', () => {
    expect(
      gestaoAlunos.limparParametros({ a: undefined, b: null, c: 0, d: false, e: 'x' })
    ).toEqual({ c: 0, d: false, e: 'x' });
    expect(gestaoAlunos.limparParametros(undefined)).toBeUndefined();
  });
});

describe('gestaoAlunos.service', () => {
  it('listarGestaoAlunos: GET com filtros sem undefined', async () => {
    await expect(
      gestaoAlunos.listarGestaoAlunos({ busca: 'ana', professor_id: 0, pagina: 2, plano_id: undefined })
    ).resolves.toBe('GET');
    expect(http.get).toHaveBeenCalledWith('/gestao/alunos', {
      params: { busca: 'ana', professor_id: 0, pagina: 2 },
    });
  });

  it('listarGestaoAlunos sem filtros', async () => {
    await gestaoAlunos.listarGestaoAlunos();
    expect(http.get).toHaveBeenCalledWith('/gestao/alunos', { params: undefined });
  });

  it('detalhe, criar, atualizar', async () => {
    const criar = { email: 'a@b.c' } as never;

    await gestaoAlunos.buscarGestaoAluno(3);
    expect(http.get).toHaveBeenCalledWith('/gestao/alunos/3');
    await gestaoAlunos.criarGestaoAluno(criar);
    expect(http.post).toHaveBeenCalledWith('/gestao/alunos', criar);
    await gestaoAlunos.atualizarGestaoAluno(3, { nome: 'x' } as never);
    expect(http.put).toHaveBeenCalledWith('/gestao/alunos/3', { nome: 'x' });
  });

  it('aprovar e recusar', async () => {
    await gestaoAlunos.aprovarAluno(4);
    expect(http.post).toHaveBeenCalledWith('/gestao/alunos/4/aprovar');
    await gestaoAlunos.recusarAluno(4);
    expect(http.post).toHaveBeenCalledWith('/gestao/alunos/4/recusar');
  });

  it('históricos', async () => {
    await gestaoAlunos.listarMatriculasAluno(5);
    expect(http.get).toHaveBeenCalledWith('/gestao/alunos/5/matriculas');
    await gestaoAlunos.listarPagamentosAluno(5);
    expect(http.get).toHaveBeenCalledWith('/gestao/alunos/5/pagamentos');
    await gestaoAlunos.listarAcessosAluno(5, { pagina: 1 });
    expect(http.get).toHaveBeenCalledWith('/gestao/alunos/5/acessos', { params: { pagina: 1 } });
    await gestaoAlunos.buscarFrequenciaGestaoAluno(5, 3);
    expect(http.get).toHaveBeenCalledWith('/gestao/alunos/5/frequencia', { params: { meses: 3 } });
    await gestaoAlunos.buscarFrequenciaGestaoAluno(5);
    expect(http.get).toHaveBeenLastCalledWith('/gestao/alunos/5/frequencia', { params: {} });
  });

  it('rotas de admin sobre aluno', async () => {
    await gestaoAlunos.alterarStatusAluno(6, { ativo: false });
    expect(http.put).toHaveBeenCalledWith('/admin/alunos/6/status', { ativo: false });
    await gestaoAlunos.trocarProfessorAluno(6, { professor_id: null });
    expect(http.put).toHaveBeenCalledWith('/admin/alunos/6/professor', { professor_id: null });
    await gestaoAlunos.alterarRestricaoAluno(6, { restricao_acesso: 'x' });
    expect(http.put).toHaveBeenCalledWith('/admin/alunos/6/restricao', { restricao_acesso: 'x' });
  });
});

describe('equipe.service', () => {
  it('professores', async () => {
    await equipe.listarProfessores();
    expect(http.get).toHaveBeenCalledWith('/admin/professores');
    await equipe.buscarProfessor(2);
    expect(http.get).toHaveBeenCalledWith('/admin/professores/2');
    const novo = { nome: 'P' } as never;

    await equipe.criarProfessor(novo);
    expect(http.post).toHaveBeenCalledWith('/admin/professores', novo);
    await equipe.atualizarProfessor(2, { nome: 'Q' } as never);
    expect(http.put).toHaveBeenCalledWith('/admin/professores/2', { nome: 'Q' });
    await equipe.alterarStatusProfessor(2, { ativo: false });
    expect(http.put).toHaveBeenCalledWith('/admin/professores/2/status', { ativo: false });
    await equipe.transferirAlunosProfessor(2, { destino_professor_id: null, aluno_ids: [1] });
    expect(http.post).toHaveBeenCalledWith('/admin/professores/2/transferir-alunos', {
      destino_professor_id: null,
      aluno_ids: [1],
    });
  });

  it('recepcionistas', async () => {
    await equipe.listarRecepcionistas();
    expect(http.get).toHaveBeenCalledWith('/admin/recepcionistas');
    await equipe.buscarRecepcionista(7);
    expect(http.get).toHaveBeenCalledWith('/admin/recepcionistas/7');
    await equipe.criarRecepcionista({ nome: 'R' } as never);
    expect(http.post).toHaveBeenCalledWith('/admin/recepcionistas', { nome: 'R' });
    await equipe.atualizarRecepcionista(7, { nome: 'S' } as never);
    expect(http.put).toHaveBeenCalledWith('/admin/recepcionistas/7', { nome: 'S' });
    await equipe.alterarStatusRecepcionista(7, { ativo: true });
    expect(http.put).toHaveBeenCalledWith('/admin/recepcionistas/7/status', { ativo: true });
    await equipe.atualizarPermissoesRecepcionista(7, { permissoes: ['matricular'] });
    expect(http.put).toHaveBeenCalledWith('/admin/recepcionistas/7/permissoes', {
      permissoes: ['matricular'],
    });
  });
});

describe('planos.service', () => {
  it('rotas de planos', async () => {
    await planos.listarPlanos({ ativo: true });
    expect(http.get).toHaveBeenCalledWith('/planos', { params: { ativo: true } });
    await planos.listarPlanos();
    expect(http.get).toHaveBeenLastCalledWith('/planos', { params: undefined });
    await planos.criarPlano({ nome: 'M', valor: '99.90' } as never);
    expect(http.post).toHaveBeenCalledWith('/admin/planos', { nome: 'M', valor: '99.90' });
    await planos.atualizarPlano(1, { nome: 'N' } as never);
    expect(http.put).toHaveBeenCalledWith('/admin/planos/1', { nome: 'N' });
    await planos.alterarStatusPlano(1, { ativo: false });
    expect(http.put).toHaveBeenCalledWith('/admin/planos/1/status', { ativo: false });
    await planos.listarAlunosDoPlano(1);
    expect(http.get).toHaveBeenCalledWith('/admin/planos/1/alunos');
  });
});

describe('matriculas.service', () => {
  it('rotas de matrículas', async () => {
    await matriculas.listarMatriculas({ aluno_id: 1, status: 'ativa', situacao: undefined });
    expect(http.get).toHaveBeenCalledWith('/matriculas', {
      params: { aluno_id: 1, status: 'ativa' },
    });
    await matriculas.criarMatricula({ aluno_id: 1, plano_id: 2 });
    expect(http.post).toHaveBeenCalledWith('/matriculas', { aluno_id: 1, plano_id: 2 });
    await matriculas.renovarMatricula(9);
    expect(http.post).toHaveBeenCalledWith('/matriculas/9/renovar', {});
    await matriculas.renovarMatricula(9, { plano_id: 3 });
    expect(http.post).toHaveBeenLastCalledWith('/matriculas/9/renovar', { plano_id: 3 });
    await matriculas.alterarPlanoMatricula(9, { plano_id: 4 });
    expect(http.post).toHaveBeenCalledWith('/matriculas/9/alterar-plano', { plano_id: 4 });
    await matriculas.cancelarMatricula(9, { motivo: 'mudou' });
    expect(http.post).toHaveBeenCalledWith('/matriculas/9/cancelar', { motivo: 'mudou' });
  });
});

describe('pagamentos.service', () => {
  it('rotas de pagamentos', async () => {
    await pagamentos.listarPagamentos({ inadimplentes: true, inicio: '2026-11-01', fim: undefined });
    expect(http.get).toHaveBeenCalledWith('/pagamentos', {
      params: { inadimplentes: true, inicio: '2026-11-01' },
    });
    await pagamentos.registrarPagamento(5, { forma: 'pix', valor_recebido: '99.90' });
    expect(http.post).toHaveBeenCalledWith('/pagamentos/5/registrar', {
      forma: 'pix',
      valor_recebido: '99.90',
    });
    const avulso = { aluno_id: 1, descricao: 'Taxa', valor: '10.00', forma: 'dinheiro' } as const;

    await pagamentos.criarPagamentoAvulso(avulso);
    expect(http.post).toHaveBeenCalledWith('/pagamentos', avulso);
    await pagamentos.estornarPagamento(5, { motivo: 'erro' });
    expect(http.post).toHaveBeenCalledWith('/pagamentos/5/estornar', { motivo: 'erro' });
    await pagamentos.buscarComprovante(5);
    expect(http.get).toHaveBeenCalledWith('/pagamentos/5/comprovante');
  });
});

describe('acessos.service', () => {
  it('verificar por aluno ou código, registrar e listar', async () => {
    await acessos.verificarAcesso({ aluno_id: 1 });
    expect(http.get).toHaveBeenCalledWith('/acessos/verificar', { params: { aluno_id: 1 } });
    await acessos.verificarAcesso({ codigo: 'abc', aluno_id: undefined });
    expect(http.get).toHaveBeenLastCalledWith('/acessos/verificar', { params: { codigo: 'abc' } });
    await acessos.registrarAcesso({ aluno_id: 1, forcar: true });
    expect(http.post).toHaveBeenCalledWith('/acessos', { aluno_id: 1, forcar: true });
    await acessos.listarAcessos({ data: '2026-11-09', resultado: 'bloqueado' });
    expect(http.get).toHaveBeenCalledWith('/acessos', {
      params: { data: '2026-11-09', resultado: 'bloqueado' },
    });
  });
});

describe('paineis.service', () => {
  it('dashboards, financeiro e frequência', async () => {
    await paineis.buscarDashboardAdmin();
    expect(http.get).toHaveBeenCalledWith('/admin/dashboard');
    await paineis.buscarDashboardRecepcao();
    expect(http.get).toHaveBeenCalledWith('/recepcao/dashboard');
    await paineis.buscarDashboardProfessor();
    expect(http.get).toHaveBeenCalledWith('/professor/dashboard');
    await paineis.buscarFinanceiro({ inicio: '2026-11-01' });
    expect(http.get).toHaveBeenCalledWith('/admin/financeiro', { params: { inicio: '2026-11-01' } });
    await paineis.buscarFrequenciaAluno(8, 6);
    expect(http.get).toHaveBeenCalledWith('/alunos/8/frequencia', { params: { meses: 6 } });
  });
});

describe('configuracao.service', () => {
  it('pública, admin e atualização', async () => {
    await configuracao.buscarConfiguracaoPublica();
    expect(http.get).toHaveBeenCalledWith('/configuracao');
    await configuracao.buscarConfiguracaoAdmin();
    expect(http.get).toHaveBeenCalledWith('/admin/configuracao');
    await configuracao.atualizarConfiguracao({ nome: 'Academia' } as never);
    expect(http.put).toHaveBeenCalledWith('/admin/configuracao', { nome: 'Academia' });
  });
});

describe('auditoria.service', () => {
  it('lista com filtros sem undefined', async () => {
    await auditoria.listarAuditoria({ user_id: 2, acao: 'plano.criar', fim: undefined, pagina: 1 });
    expect(http.get).toHaveBeenCalledWith('/admin/auditoria', {
      params: { user_id: 2, acao: 'plano.criar', pagina: 1 },
    });
  });
});

describe('ficha.service (extensões)', () => {
  it('publicar, versões, duplicar ficha e item', async () => {
    await ficha.publicarFicha(1);
    expect(http.post).toHaveBeenCalledWith('/ficha/1/publicar');
    await ficha.listarVersoesFicha(1);
    expect(http.get).toHaveBeenCalledWith('/ficha/1/versoes');
    await ficha.buscarVersaoFicha(1, 3);
    expect(http.get).toHaveBeenCalledWith('/ficha/1/versoes/3');
    await ficha.duplicarFicha(1);
    expect(http.post).toHaveBeenCalledWith('/ficha/1/duplicar', {});
    await ficha.duplicarFicha(1, { aluno_id: 2, nome: 'Cópia' });
    expect(http.post).toHaveBeenLastCalledWith('/ficha/1/duplicar', { aluno_id: 2, nome: 'Cópia' });
    await ficha.duplicarItemFicha(4);
    expect(http.post).toHaveBeenCalledWith('/ficha/item/4/duplicar');
  });
});

describe('ficha.service (salvar ficha completa)', () => {
  it('PUT /ficha/{id}/completa com o estado completo', async () => {
    const dados = { nome: 'F', treinos: [] };

    await ficha.salvarFichaCompleta(7, dados);
    expect(http.put).toHaveBeenCalledWith('/ficha/7/completa', dados);
  });
});

describe('exercicio.service (filtro origem)', () => {
  it('envia origem na query', async () => {
    await exercicio.buscarExercicios(1, { origem: 'meus', busca: 'supino' });
    expect(http.get).toHaveBeenCalledWith('/exercicios', {
      params: expect.objectContaining({ pagina: 1, busca: 'supino', origem: 'meus' }),
    });
  });
});
