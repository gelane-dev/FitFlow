import { AvaliacaoCriar, AvaliacaoResposta } from '@/types/avaliacao.types';
import { dataBrParaIso, formatarData } from '@/utils/datas';
import { lerNumero } from '@/utils/vigencia';

export interface CamposAvaliacao {
  /** Digitada e exibida em DD/MM/AAAA; vai para a API em ISO. */
  data: string;
  peso: string;
  altura: string;
  percentualGordura: string;
  massaMuscular: string;
  observacao: string;
}

export type ResultadoAvaliacao =
  | { dados: AvaliacaoCriar; erro?: undefined }
  | { dados?: undefined; erro: string };

export function hojeIso(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');

  return `${agora.getFullYear()}-${mes}-${dia}`;
}

export function camposVazios(): CamposAvaliacao {
  return {
    data: formatarData(hojeIso()),
    peso: '',
    altura: '',
    percentualGordura: '',
    massaMuscular: '',
    observacao: '',
  };
}

export function camposDaAvaliacao(a: AvaliacaoResposta): CamposAvaliacao {
  return {
    data: formatarData(a.data_avaliacao),
    peso: String(a.peso),
    altura: String(a.altura),
    percentualGordura:
      a.percentual_gordura == null ? '' : String(a.percentual_gordura),
    massaMuscular: a.massa_muscular == null ? '' : String(a.massa_muscular),
    observacao: a.observacao ?? '',
  };
}

/** Erros de validação por campo (vazio = tudo válido). Ordem: data, peso, altura, gordura, massa. */
export function errosAvaliacao(
  campos: CamposAvaliacao
): Partial<Record<keyof CamposAvaliacao, string>> {
  const erros: Partial<Record<keyof CamposAvaliacao, string>> = {};

  if (dataBrParaIso(campos.data) === null) {
    erros.data = 'Informe a data no formato DD/MM/AAAA.';
  }

  if (!(lerNumero(campos.peso) > 0)) {
    erros.peso = 'Informe um peso válido (kg).';
  }

  const altura = lerNumero(campos.altura);

  if (!(altura >= 0.5 && altura <= 2.5)) {
    erros.altura = 'Informe a altura em metros (entre 0,5 e 2,5).';
  }

  if (campos.percentualGordura.trim() !== '') {
    const gordura = lerNumero(campos.percentualGordura);

    if (!(gordura >= 0 && gordura <= 100)) {
      erros.percentualGordura = 'O percentual de gordura deve estar entre 0 e 100.';
    }
  }

  if (
    campos.massaMuscular.trim() !== '' &&
    !(lerNumero(campos.massaMuscular) > 0)
  ) {
    erros.massaMuscular = 'A massa muscular deve ser maior que zero.';
  }

  return erros;
}

/**
 * Valida os campos do formulário segundo o contrato (peso > 0,
 * altura 0.5..2.5 m, gordura 0..100, massa > 0). `horaOriginal` preserva
 * o horário ao editar ("HH:MM:SS").
 */
export function montarAvaliacao(
  campos: CamposAvaliacao,
  horaOriginal = '00:00:00'
): ResultadoAvaliacao {
  const erros = errosAvaliacao(campos);
  const primeiro = Object.values(erros)[0];

  if (primeiro) {
    return { erro: primeiro };
  }

  const peso = lerNumero(campos.peso);
  const altura = lerNumero(campos.altura);
  const percentualGordura =
    campos.percentualGordura.trim() !== ''
      ? lerNumero(campos.percentualGordura)
      : null;
  const massaMuscular =
    campos.massaMuscular.trim() !== ''
      ? lerNumero(campos.massaMuscular)
      : null;

  return {
    dados: {
      data_avaliacao: `${dataBrParaIso(campos.data)}T${horaOriginal}`,
      peso,
      altura,
      percentual_gordura: percentualGordura,
      massa_muscular: massaMuscular,
      observacao: campos.observacao.trim() || null,
    },
  };
}
