import axios, { isAxiosError } from 'axios';

import { ErroApi } from '@/types/api.types';

/** Extrai o `detail` da API (ex.: 400/409) ou devolve a mensagem padrão. */
export function mensagemErro(erro: unknown, padrao: string): string {
  if (axios.isAxiosError<ErroApi>(erro)) {
    if (erro.code === 'ECONNABORTED' || erro.code === 'ETIMEDOUT') {
      return 'O servidor demorou para responder. Verifique sua conexão e tente novamente.';
    }

    const detalhe = erro.response?.data?.detail;

    return typeof detalhe === 'string' && detalhe ? detalhe : padrao;
  }

  return 'Ocorreu um erro inesperado.';
}

/**
 * Erro do login. Os 403 do contrato (cadastro pendente, recusado, conta desativada) chegam como
 * `detail` e são exibidos como estão; 403 sem texto vira uma orientação genérica, nunca "erro inesperado".
 */
export function mensagemErroLogin(erro: unknown): string {
  if (isAxiosError<ErroApi>(erro) && erro.response?.status === 403) {
    return mensagemErro(erro, 'Acesso não liberado. Procure a recepção.');
  }

  return mensagemErro(erro, 'Erro ao realizar login.');
}
