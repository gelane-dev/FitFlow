import { formatarDetalhe, rotuloAcao, rotuloEntidade, rotuloTipoUsuario } from '../auditoria';

describe('auditoria', () => {
  it('traduz ação conhecida', () => {
    expect(rotuloAcao('plano.criar')).toBe('Plano criado');
    expect(rotuloAcao('aluno.trocar_professor')).toBe('Aluno trocou de professor');
    expect(rotuloAcao('pagamento.estornar')).toBe('Pagamento estornado');
    expect(rotuloAcao('pagamento.registrar')).toBe('Pagamento recebido');
  });

  it('concorda o gênero das entidades femininas', () => {
    expect(rotuloAcao('matricula.criar')).toBe('Matrícula criada');
    expect(rotuloAcao('configuracao.editar')).toBe('Configuração editada');
    expect(rotuloAcao('matricula.cancelar')).toBe('Matrícula cancelada');
  });

  it('ação desconhecida volta como veio', () => {
    expect(rotuloAcao('x.y')).toBe('x.y');
    expect(rotuloAcao('semponto')).toBe('semponto');
  });

  it('entidade e tipo de usuário', () => {
    expect(rotuloEntidade('matricula')).toBe('Matrícula');
    expect(rotuloEntidade('outra')).toBe('outra');
    expect(rotuloTipoUsuario('recepcao')).toBe('Recepção');
  });

  it('formata detalhes', () => {
    expect(formatarDetalhe(null)).toBe('—');
    expect(formatarDetalhe(true)).toBe('Sim');
    expect(formatarDetalhe(['a', 'b'])).toBe('a, b');
    expect(formatarDetalhe([])).toBe('—');
    expect(formatarDetalhe(5)).toBe('5');
  });
});
