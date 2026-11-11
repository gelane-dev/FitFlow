import {
  cpfValido,
  DadosFormularioAluno,
  horaDaApi,
  mascararCpf,
  situacaoPrincipalAluno,
  temPermissao,
  validarAvulso,
  validarFormularioAluno,
  validarMotivo,
  validarRecebimento,
} from '@/utils/gestaoRecepcao';

const valido: DadosFormularioAluno = {
  nome: 'Ana Souza',
  email: 'ana@email.com',
  senha: 'segredo1',
  telefone: '(11) 91234-5678',
  dataNascimento: '10/05/1995',
  cpf: '123.456.789-01',
  endereco: '',
  observacoes: '',
};

describe('temPermissao', () => {
  it('só vale com a permissão na lista', () => {
    expect(temPermissao(['matricular'], 'matricular')).toBe(true);
    expect(temPermissao(['matricular'], 'cancelar_matricula')).toBe(false);
    expect(temPermissao(null, 'matricular')).toBe(false);
    expect(temPermissao(undefined, 'matricular')).toBe(false);
  });
});

describe('CPF', () => {
  it('mascara enquanto digita', () => {
    expect(mascararCpf('12345678901')).toBe('123.456.789-01');
    expect(mascararCpf('1234')).toBe('123.4');
    expect(mascararCpf('abc')).toBe('');
  });

  it('aceita vazio ou 11 dígitos', () => {
    expect(cpfValido('')).toBe(true);
    expect(cpfValido('123.456.789-01')).toBe(true);
    expect(cpfValido('123.456')).toBe(false);
  });
});

describe('validarFormularioAluno', () => {
  it('aceita dados completos', () => {
    expect(validarFormularioAluno(valido, 'criar')).toEqual({});
  });

  it('exige nome, e-mail, senha, telefone e nascimento ao criar', () => {
    const erros = validarFormularioAluno(
      { ...valido, nome: ' ', email: '', senha: '123', telefone: '1', dataNascimento: '' },
      'criar'
    );

    expect(Object.keys(erros).sort()).toEqual(['dataNascimento', 'email', 'nome', 'senha', 'telefone']);
  });

  it('rejeita e-mail inválido, data inexistente, data futura e CPF incompleto', () => {
    expect(validarFormularioAluno({ ...valido, email: 'sem-arroba' }, 'criar').email).toBeDefined();
    expect(validarFormularioAluno({ ...valido, dataNascimento: '30/02/1990' }, 'criar').dataNascimento).toBeDefined();
    expect(validarFormularioAluno({ ...valido, dataNascimento: '01/01/2999' }, 'criar').dataNascimento).toMatch(/futuro/);
    expect(validarFormularioAluno({ ...valido, cpf: '123' }, 'criar').cpf).toBeDefined();
  });

  it('ao editar não exige e-mail nem senha', () => {
    expect(validarFormularioAluno({ ...valido, email: '', senha: '' }, 'editar')).toEqual({});
  });
});

describe('pagamentos', () => {
  it('recebimento exige forma; valor vazio vale o do pagamento, mas zero não', () => {
    expect(validarRecebimento({ forma: null, valor: null }).forma).toBeDefined();
    expect(validarRecebimento({ forma: 'pix', valor: null })).toEqual({});
    expect(validarRecebimento({ forma: 'pix', valor: '0.00' }).valor).toBeDefined();
    expect(validarRecebimento({ forma: 'pix', valor: '50.00' })).toEqual({});
  });

  it('avulso exige aluno, descrição, valor maior que zero e forma', () => {
    const erros = validarAvulso({ alunoId: null, descricao: ' ', valor: null, forma: null });

    expect(Object.keys(erros).sort()).toEqual(['aluno', 'descricao', 'forma', 'valor']);
    expect(validarAvulso({ alunoId: 1, descricao: 'Água', valor: '5.00', forma: 'dinheiro' })).toEqual({});
  });

  it('motivo obrigatório', () => {
    expect(validarMotivo('  ').motivo).toBeDefined();
    expect(validarMotivo('erro de lançamento')).toEqual({});
  });
});

describe('situacaoPrincipalAluno', () => {
  const base = { ativo: true, status_cadastro: 'aprovado' as const, situacao: 'vigente' };

  it('desativado vence cadastro pendente, que vence a matrícula', () => {
    expect(situacaoPrincipalAluno({ ...base, ativo: false, status_cadastro: 'pendente' })).toBe('desativado');
    expect(situacaoPrincipalAluno({ ...base, status_cadastro: 'pendente' })).toBe('pendente');
    expect(situacaoPrincipalAluno({ ...base, status_cadastro: 'recusado' })).toBe('recusado');
    expect(situacaoPrincipalAluno(base)).toBe('vigente');
  });
});

describe('horaDaApi', () => {
  it('pega a hora do texto sem converter fuso', () => {
    expect(horaDaApi('2026-11-09T10:30:00-03:00')).toBe('10:30');
    expect(horaDaApi(null)).toBe('—');
  });
});
