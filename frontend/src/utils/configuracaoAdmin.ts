/** Formulário de configurações da academia: conversão entre API e campos de texto, e validação. */

import type { ConfiguracaoAdmin, ConfiguracaoAtualizar, HorarioFuncionamento } from '@/types/gestao.types';

import { completarHorarios, prepararHorariosParaSalvar, validarHorarios } from './horarios';
import { emailValido } from './validacaoFormularios';

export interface EstadoConfiguracao {
  nome: string;
  endereco: string;
  telefone: string;
  email: string;
  horarios: HorarioFuncionamento[];
  tolerancia: string;
  bloquearPendencia: boolean;
  diasAlerta: string;
  diasReavaliacao: string;
  diasAtualizarTreino: string;
}

export type ErrosConfiguracao = Partial<
  Record<'nome' | 'email' | 'tolerancia' | 'diasAlerta' | 'diasReavaliacao' | 'diasAtualizarTreino', string>
> & { horarios?: Record<string, string> };

export function configuracaoParaEstado(c: ConfiguracaoAdmin): EstadoConfiguracao {
  return {
    nome: c.nome,
    endereco: c.endereco ?? '',
    telefone: c.telefone ?? '',
    email: c.email ?? '',
    horarios: completarHorarios(c.horarios),
    tolerancia: String(c.tolerancia_dias_vencimento),
    bloquearPendencia: c.bloquear_pagamento_pendente,
    diasAlerta: String(c.dias_alerta_vencimento),
    diasReavaliacao: String(c.dias_reavaliacao),
    diasAtualizarTreino: String(c.dias_atualizar_treino),
  };
}

const inteiroNaoNegativo = (texto: string) => /^\d+$/.test(texto.trim());

export function validarConfiguracao(e: EstadoConfiguracao): ErrosConfiguracao {
  const erros: ErrosConfiguracao = {};
  const mensagemInteiro = 'Informe um número inteiro, zero ou maior.';

  if (e.nome.trim().length < 2) erros.nome = 'Informe o nome da academia.';
  if (e.email.trim() && !emailValido(e.email.trim())) erros.email = 'Informe um e-mail válido.';
  if (!inteiroNaoNegativo(e.tolerancia)) erros.tolerancia = mensagemInteiro;
  if (!inteiroNaoNegativo(e.diasAlerta)) erros.diasAlerta = mensagemInteiro;
  if (!inteiroNaoNegativo(e.diasReavaliacao)) erros.diasReavaliacao = mensagemInteiro;
  if (!inteiroNaoNegativo(e.diasAtualizarTreino)) erros.diasAtualizarTreino = mensagemInteiro;

  const errosHorarios = validarHorarios(e.horarios);

  if (Object.keys(errosHorarios).length > 0) erros.horarios = errosHorarios;

  return erros;
}

export function haErros(erros: ErrosConfiguracao): boolean {
  return Object.keys(erros).length > 0;
}

/** Estado válido -> corpo do `PUT /admin/configuracao`. Campos de texto vazios viram `null`. */
export function estadoParaPayload(e: EstadoConfiguracao): ConfiguracaoAtualizar {
  const ouNulo = (texto: string) => texto.trim() || null;

  return {
    nome: e.nome.trim(),
    endereco: ouNulo(e.endereco),
    telefone: ouNulo(e.telefone),
    email: ouNulo(e.email),
    horarios: prepararHorariosParaSalvar(e.horarios),
    tolerancia_dias_vencimento: Number(e.tolerancia),
    bloquear_pagamento_pendente: e.bloquearPendencia,
    dias_alerta_vencimento: Number(e.diasAlerta),
    dias_reavaliacao: Number(e.diasReavaliacao),
    dias_atualizar_treino: Number(e.diasAtualizarTreino),
  };
}

/** Há alteração em relação ao que o servidor guardou? */
export function configuracaoAlterada(atual: EstadoConfiguracao, original: ConfiguracaoAdmin): boolean {
  return JSON.stringify(atual) !== JSON.stringify(configuracaoParaEstado(original));
}
