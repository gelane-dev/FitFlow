import { AvaliacaoResposta } from '@/types/avaliacao.types';
import {
  camposDaAvaliacao,
  CamposAvaliacao,
  camposVazios,
  hojeIso,
  errosAvaliacao,
  montarAvaliacao,
} from '@/utils/avaliacaoForm';

const validos: CamposAvaliacao = {
  data: '30/10/2026',
  peso: '80,5',
  altura: '1,80',
  percentualGordura: '',
  massaMuscular: '',
  observacao: '',
};

const ERRO_ALTURA = 'Informe a altura em metros (entre 0,5 e 2,5).';
const ERRO_DATA = 'Informe a data no formato DD/MM/AAAA.';
const ERRO_PESO = 'Informe um peso válido (kg).';
const ERRO_GORDURA = 'O percentual de gordura deve estar entre 0 e 100.';

describe('hojeIso / camposVazios', () => {
  afterEach(() => jest.useRealTimers());

  it('usa a data local no formato AAAA-MM-DD', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 5, 23, 30));

    expect(hojeIso()).toBe('2026-01-05');
    expect(camposVazios()).toEqual({
      data: '05/01/2026',
      peso: '',
      altura: '',
      percentualGordura: '',
      massaMuscular: '',
      observacao: '',
    });
  });
});

describe('camposDaAvaliacao', () => {
  it('converte a resposta em texto e trata nulos', () => {
    const resposta: AvaliacaoResposta = {
      id: 1,
      aluno_id: 1,
      professor_id: 1,
      data_avaliacao: '2026-10-30T09:15:00',
      peso: 80.5,
      altura: 1.8,
      percentual_gordura: null,
      massa_muscular: 35,
      observacao: null,
      imc: 24.8,
    };

    expect(camposDaAvaliacao(resposta)).toEqual({
      data: '30/10/2026',
      peso: '80.5',
      altura: '1.8',
      percentualGordura: '',
      massaMuscular: '35',
      observacao: '',
    });
  });
});

describe('montarAvaliacao', () => {
  it('monta o payload com opcionais nulos e vírgula decimal', () => {
    expect(montarAvaliacao(validos)).toEqual({
      dados: {
        data_avaliacao: '2026-10-30T00:00:00',
        peso: 80.5,
        altura: 1.8,
        percentual_gordura: null,
        massa_muscular: null,
        observacao: null,
      },
    });
  });

  it('preserva a hora original ao editar e inclui opcionais', () => {
    const resultado = montarAvaliacao(
      { ...validos, percentualGordura: '18,5', massaMuscular: '36', observacao: ' ok ' },
      '09:15:00'
    );

    expect(resultado.dados).toMatchObject({
      data_avaliacao: '2026-10-30T09:15:00',
      percentual_gordura: 18.5,
      massa_muscular: 36,
      observacao: 'ok',
    });
  });

  it.each([
    ['data vazia', { data: '' }, ERRO_DATA],
    ['data em ISO', { data: '2026-10-30' }, ERRO_DATA],
    ['data inexistente', { data: '30/02/2026' }, ERRO_DATA],
    ['peso vazio', { peso: '' }, ERRO_PESO],
    ['peso zero', { peso: '0' }, ERRO_PESO],
    ['altura baixa', { altura: '0,4' }, ERRO_ALTURA],
    ['altura alta', { altura: '2,6' }, ERRO_ALTURA],
    ['altura em cm', { altura: '180' }, ERRO_ALTURA],
    ['gordura > 100', { percentualGordura: '101' }, ERRO_GORDURA],
    ['gordura inválida', { percentualGordura: 'x' }, ERRO_GORDURA],
    ['massa zero', { massaMuscular: '0' }, 'A massa muscular deve ser maior que zero.'],
  ])('rejeita %s', (_nome, alteracao, mensagem) => {
    expect(montarAvaliacao({ ...validos, ...alteracao })).toEqual({
      erro: mensagem,
    });
  });

  it('aceita os limites: altura 0,5/2,5 e gordura 0/100', () => {
    expect(montarAvaliacao({ ...validos, altura: '0,5' }).dados).toBeDefined();
    expect(montarAvaliacao({ ...validos, altura: '2,5' }).dados).toBeDefined();
    expect(
      montarAvaliacao({ ...validos, percentualGordura: '0' }).dados
        ?.percentual_gordura
    ).toBe(0);
    expect(
      montarAvaliacao({ ...validos, percentualGordura: '100' }).dados
        ?.percentual_gordura
    ).toBe(100);
  });
});

describe('errosAvaliacao', () => {
  const campos = {
    data: '31/10/2026',
    peso: '72,5',
    altura: '1,75',
    percentualGordura: '',
    massaMuscular: '',
    observacao: '',
  };

  it('sem erros para campos válidos', () => {
    expect(errosAvaliacao(campos)).toEqual({});
  });

  it('aponta cada campo inválido separadamente', () => {
    const erros = errosAvaliacao({
      ...campos,
      data: '31/10',
      peso: '0',
      altura: '3',
      percentualGordura: '101',
      massaMuscular: '-1',
    });

    expect(Object.keys(erros)).toEqual([
      'data',
      'peso',
      'altura',
      'percentualGordura',
      'massaMuscular',
    ]);
  });
});
