import { ConfiguracaoAdmin } from '@/types/gestao.types';

import {
  configuracaoAlterada,
  configuracaoParaEstado,
  estadoParaPayload,
  haErros,
  validarConfiguracao,
} from '../configuracaoAdmin';

const BASE: ConfiguracaoAdmin = {
  nome: 'FitFlow',
  endereco: null,
  telefone: null,
  email: null,
  horarios: [],
  tolerancia_dias_vencimento: 0,
  bloquear_pagamento_pendente: false,
  dias_alerta_vencimento: 7,
  dias_reavaliacao: 90,
  dias_atualizar_treino: 60,
  atualizado_em: null,
};

describe('configuracaoAdmin', () => {
  it('converte a API em campos de texto com 7 dias de horário', () => {
    const estado = configuracaoParaEstado(BASE);

    expect(estado.tolerancia).toBe('0');
    expect(estado.diasAlerta).toBe('7');
    expect(estado.endereco).toBe('');
    expect(estado.horarios).toHaveLength(7);
  });

  it('configuração intacta é válida e não está alterada', () => {
    const estado = configuracaoParaEstado(BASE);

    expect(haErros(validarConfiguracao(estado))).toBe(false);
    expect(configuracaoAlterada(estado, BASE)).toBe(false);
  });

  it('detecta alteração', () => {
    const estado = { ...configuracaoParaEstado(BASE), nome: 'Outra' };

    expect(configuracaoAlterada(estado, BASE)).toBe(true);
  });

  it('rejeita números negativos, decimais e vazios', () => {
    const estado = { ...configuracaoParaEstado(BASE), tolerancia: '-1', diasAlerta: '1.5', diasReavaliacao: '' };
    const erros = validarConfiguracao(estado);

    expect(erros.tolerancia).toBeDefined();
    expect(erros.diasAlerta).toBeDefined();
    expect(erros.diasReavaliacao).toBeDefined();
    expect(erros.diasAtualizarTreino).toBeUndefined();
  });

  it('valida e-mail só quando preenchido e nome sempre', () => {
    const estado = { ...configuracaoParaEstado(BASE), nome: ' ', email: 'x' };
    const erros = validarConfiguracao(estado);

    expect(erros.nome).toBeDefined();
    expect(erros.email).toBeDefined();
  });

  it('horário de dia aberto inválido gera erro por dia', () => {
    const estado = configuracaoParaEstado(BASE);

    estado.horarios[0] = { ...estado.horarios[0], fechado: false, abre: '25:00', fecha: '10:00' };

    expect(validarConfiguracao(estado).horarios).toEqual({ segunda: expect.any(String) });
  });

  it('payload: textos vazios viram null e números viram inteiros', () => {
    const estado = { ...configuracaoParaEstado(BASE), endereco: ' Rua A ', tolerancia: '3', bloquearPendencia: true };
    const payload = estadoParaPayload(estado);

    expect(payload.endereco).toBe('Rua A');
    expect(payload.telefone).toBeNull();
    expect(payload.tolerancia_dias_vencimento).toBe(3);
    expect(payload.bloquear_pagamento_pendente).toBe(true);
    expect(payload.horarios).toHaveLength(7);
    expect(payload).not.toHaveProperty('atualizado_em');
  });
});
