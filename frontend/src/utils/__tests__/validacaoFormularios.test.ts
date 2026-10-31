import {
  emailValido,
  lerCarga,
  temErros,
  validarExercicio,
  validarFicha,
  validarItem,
  validarLogin,
  validarTrocaSenha,
  validarTreino,
} from '@/utils/validacaoFormularios';

describe('validarExercicio', () => {
  it('aponta cada campo vazio', () => {
    const erros = validarExercicio({ nome: ' ', descricao: '', grupo: '' });

    expect(erros).toEqual({
      nome: 'Informe o nome do exercício.',
      descricao: 'Informe a descrição do exercício.',
      grupo: 'Informe o grupo muscular.',
    });
  });

  it('aceita campos preenchidos', () => {
    const erros = validarExercicio({ nome: 'Supino', descricao: 'Peito', grupo: 'Peito' });

    expect(temErros(erros)).toBe(false);
  });
});

describe('validarFicha', () => {
  const base = { nome: 'Ficha A', dataInicio: '', dataFim: '' };

  it('exige nome e, se pedido, aluno', () => {
    const erros = validarFicha({ ...base, nome: '', exigirAluno: true, alunoId: null });

    expect(erros.nome).toBeDefined();
    expect(erros.aluno).toBe('Selecione o aluno.');
  });

  it('não exige aluno na edição', () => {
    expect(temErros(validarFicha(base))).toBe(false);
  });

  it('valida o formato das datas (vazio é aceito)', () => {
    const erros = validarFicha({ ...base, dataInicio: '01/13/2026', dataFim: '2026-10-31' });

    expect(erros.dataInicio).toBe('Use o formato DD/MM/AAAA.');
    expect(erros.dataFim).toBe('Use o formato DD/MM/AAAA.');
    expect(temErros(validarFicha({ ...base, dataInicio: '31/10/2026' }))).toBe(false);
  });
});

describe('validarTreino', () => {
  it('exige nome e ordem maior que zero', () => {
    expect(validarTreino({ nome: '', ordem: '0' })).toEqual({
      nome: 'Informe o nome do treino.',
      ordem: 'Informe uma ordem válida.',
    });
    expect(validarTreino({ nome: 'A', ordem: 'abc' }).ordem).toBeDefined();
    expect(temErros(validarTreino({ nome: 'A', ordem: '2' }))).toBe(false);
  });
});

describe('validarItem', () => {
  const valido = { series: '4', repeticoes: '12', carga: '40', descanso: '60' };

  it('aceita itens válidos, inclusive carga 0 e vírgula decimal', () => {
    expect(temErros(validarItem(valido))).toBe(false);
    expect(temErros(validarItem({ ...valido, carga: '0' }))).toBe(false);
    expect(temErros(validarItem({ ...valido, carga: '12,5' }))).toBe(false);
  });

  it('aponta os campos inválidos', () => {
    const erros = validarItem({ series: '0', repeticoes: '', carga: 'abc', descanso: '0' });

    expect(Object.keys(erros).sort()).toEqual(['carga', 'descanso', 'repeticoes', 'series']);
  });

  it('carga vazia é opcional (vale 0)', () => {
    expect(validarItem({ ...valido, carga: '' }).carga).toBeUndefined();
    expect(lerCarga('')).toBe(0);
    expect(lerCarga('12,5')).toBe(12.5);
  });

  it('exige exercício só quando pedido', () => {
    expect(validarItem({ ...valido, exigirExercicio: true, exercicioId: null }).exercicio).toBe(
      'Selecione um exercício.'
    );
    expect(validarItem({ ...valido, exigirExercicio: true, exercicioId: 3 }).exercicio).toBeUndefined();
    expect(validarItem(valido).exercicio).toBeUndefined();
  });

  it('valida a ordem quando informada', () => {
    expect(validarItem({ ...valido, ordem: '0' }).ordem).toBeDefined();
    expect(validarItem({ ...valido, ordem: '2' }).ordem).toBeUndefined();
  });
});

describe('validarLogin (P-N)', () => {
  it('e-mail inválido tem mensagem própria', () => {
    expect(validarLogin({ email: 'texto colado', senha: 'x' }).email).toBe(
      'Informe um e-mail válido (ex.: nome@email.com).'
    );
    expect(validarLogin({ email: '', senha: 'x' }).email).toBe('Informe seu e-mail.');
    expect(validarLogin({ email: 'a@b.com', senha: '' }).senha).toBe('Informe sua senha.');
    expect(temErros(validarLogin({ email: ' a@b.com ', senha: 'x' }))).toBe(false);
  });

  it('emailValido', () => {
    expect(emailValido('prof.demo@fitflow.com')).toBe(true);
    expect(emailValido('sem-arroba')).toBe(false);
    expect(emailValido('a@b')).toBe(false);
  });
});

describe('validarTrocaSenha (P-G)', () => {
  it('exige nova senha e confirmação igual', () => {
    expect(
      validarTrocaSenha({ senhaAtual: 'a', novaSenha: '', confirmacao: '' }).novaSenha
    ).toBe('Informe a nova senha.');
    expect(
      validarTrocaSenha({ senhaAtual: 'a', novaSenha: 'nova', confirmacao: 'outra' }).confirmacao
    ).toBe('A confirmação precisa ser igual à nova senha.');
    expect(
      validarTrocaSenha({ senhaAtual: '', novaSenha: 'nova', confirmacao: 'nova' }).senhaAtual
    ).toBe('Informe a senha atual.');
    expect(
      temErros(validarTrocaSenha({ senhaAtual: 'a', novaSenha: 'nova', confirmacao: 'nova' }))
    ).toBe(false);
  });
});
