import axios from 'axios';

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
