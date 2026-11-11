import { cores } from '@/theme';
import {
  corDoTom,
  FORMAS_PAGAMENTO,
  formaPagamento,
  MOTIVOS_BLOQUEIO,
  motivoBloqueio,
  RESULTADOS_ACESSO,
  resultadoAcesso,
  SITUACOES_ALUNO,
  SITUACOES_MATRICULA,
  situacaoAluno,
  situacaoMatricula,
  STATUS_CADASTRO,
  STATUS_FICHA,
  STATUS_MATRICULA,
  STATUS_PAGAMENTO,
  statusCadastro,
  statusFicha,
  statusMatricula,
  statusPagamento,
  TomSituacao,
} from '@/utils/situacao';

const TONS: TomSituacao[] = ['sucesso', 'aviso', 'perigo', 'neutro'];

const tabelas = {
  situacaoMatricula: [
    SITUACOES_MATRICULA,
    ['vigente', 'vencendo', 'vencida', 'sem_matricula'],
    situacaoMatricula,
  ],
  situacaoAluno: [
    SITUACOES_ALUNO,
    ['vigente', 'vencendo', 'vencida', 'sem_matricula', 'pendente', 'desativado', 'inadimplente'],
    situacaoAluno,
  ],
  statusMatricula: [
    STATUS_MATRICULA,
    ['ativa', 'encerrada', 'substituida', 'cancelada'],
    statusMatricula,
  ],
  statusPagamento: [
    STATUS_PAGAMENTO,
    ['pendente', 'pago', 'estornado', 'cancelado'],
    statusPagamento,
  ],
  formaPagamento: [
    FORMAS_PAGAMENTO,
    ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia', 'outro'],
    formaPagamento,
  ],
  resultadoAcesso: [RESULTADOS_ACESSO, ['liberado', 'bloqueado'], resultadoAcesso],
  motivoBloqueio: [
    MOTIVOS_BLOQUEIO,
    [
      'conta_desativada',
      'cadastro_pendente',
      'restricao',
      'sem_matricula',
      'matricula_vencida',
      'pagamento_pendente',
    ],
    motivoBloqueio,
  ],
  statusCadastro: [STATUS_CADASTRO, ['pendente', 'aprovado', 'recusado'], statusCadastro],
  statusFicha: [STATUS_FICHA, ['rascunho', 'publicada'], statusFicha],
} as const;

describe.each(Object.entries(tabelas))('%s', (_nome, [tabela, codigos, consultar]) => {
  it('mapeia exatamente todos os códigos do contrato', () => {
    expect(Object.keys(tabela).sort()).toEqual([...codigos].sort());
  });

  it.each([...codigos])('%s tem rótulo, tom válido e ícone', (codigo) => {
    const info = consultar(codigo);

    expect(info.rotulo.length).toBeGreaterThan(0);
    expect(TONS).toContain(info.tom);
    expect(info.icone).toEqual(expect.any(String));
    expect(info.icone).not.toBe('help-circle-outline');
  });

  it('código desconhecido, nulo ou vazio vira neutro', () => {
    expect(consultar('inexistente')).toEqual({
      rotulo: 'inexistente',
      tom: 'neutro',
      icone: 'help-circle-outline',
    });
    expect(consultar(null).rotulo).toBe('—');
    expect(consultar(undefined).tom).toBe('neutro');
    expect(consultar('toString').tom).toBe('neutro');
  });
});

describe('tons semânticos', () => {
  it('situação de matrícula', () => {
    expect(situacaoMatricula('vigente').tom).toBe('sucesso');
    expect(situacaoMatricula('vencendo').tom).toBe('aviso');
    expect(situacaoMatricula('vencida').tom).toBe('perigo');
    expect(situacaoMatricula('sem_matricula').tom).toBe('neutro');
  });

  it('pagamento e acesso', () => {
    expect(statusPagamento('pago').tom).toBe('sucesso');
    expect(statusPagamento('pendente').tom).toBe('aviso');
    expect(statusPagamento('estornado').tom).toBe('perigo');
    expect(resultadoAcesso('liberado').tom).toBe('sucesso');
    expect(resultadoAcesso('bloqueado').tom).toBe('perigo');
  });
});

describe('corDoTom', () => {
  it('devolve chave de token existente em cores, nunca hexadecimal', () => {
    for (const tom of TONS) {
      const chave = corDoTom(tom);

      expect(chave).not.toMatch(/^#/);
      expect(cores[chave]).toEqual(expect.any(String));
    }

    expect(corDoTom('sucesso')).toBe('sucesso');
    expect(corDoTom('aviso')).toBe('aviso');
    expect(corDoTom('perigo')).toBe('perigo');
  });
});
