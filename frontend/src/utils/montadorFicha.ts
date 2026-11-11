import { DiaSemana, FichaCompleta, FichaCompletaAtualizar, ItemFicha, StatusFicha } from '@/types/ficha.types';
import { Exercicio } from '@/types/exercicio.types';
import { dataBrParaIso, dataBrValida, formatarData } from '@/utils/datas';
import { lerCarga } from '@/utils/validacaoFormularios';
import { lerNumero } from '@/utils/vigencia';

/**
 * Estado local do montador de fichas (web). Tudo que o professor digita fica aqui; nada vai para
 * a API até "Salvar rascunho"/"Publicar". Funções puras: o hook só orquestra as chamadas.
 */

export interface ItemMontador {
  /** Identidade local estável (React key e reordenação). */
  chave: string;
  /** `null` = ainda não existe no servidor. */
  id: number | null;
  exercicioId: number;
  nome: string;
  grupoMuscular: string;
  imagem: string | null;
  series: string;
  repeticoes: string;
  carga: string;
  descanso: string;
  observacao: string;
}

export interface DivisaoMontador {
  chave: string;
  id: number | null;
  nome: string;
  /** `null` = "Sem dia fixo". */
  dia: DiaSemana | null;
  itens: ItemMontador[];
}

export interface FichaMontador {
  id: number | null;
  status: StatusFicha;
  alunoId: number | null;
  nome: string;
  objetivo: string;
  /** DD/MM/AAAA (vazio = padrão do servidor). */
  dataInicio: string;
  dataFim: string;
  divisoes: DivisaoMontador[];
  /** Ids de treinos que existiam no servidor e foram removidos no montador. */
  treinosRemovidos: number[];
  /** Ids de itens (de treinos mantidos) removidos no montador. */
  itensRemovidos: number[];
}

export const SERIES_PADRAO = '3';
export const REPETICOES_PADRAO = '12';
export const DESCANSO_PADRAO = '60';

let contador = 0;

/** Chave local única (não vai para a API). */
export function novaChave(prefixo = 'k'): string {
  contador += 1;

  return `${prefixo}-${Date.now().toString(36)}-${contador}`;
}

/** "A", "B"... "Z"; depois "AA". Usado no nome padrão da divisão. */
export function letraDivisao(indice: number): string {
  let n = indice;
  let texto = '';

  do {
    texto = String.fromCharCode(65 + (n % 26)) + texto;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);

  return texto;
}

export function nomePadraoDivisao(indice: number): string {
  return `Treino ${letraDivisao(indice)}`;
}

export function novaDivisao(indice: number): DivisaoMontador {
  return {
    chave: novaChave('div'),
    id: null,
    nome: nomePadraoDivisao(indice),
    dia: null,
    itens: [],
  };
}

export function fichaVazia(alunoId: number | null = null): FichaMontador {
  return {
    id: null,
    status: 'rascunho',
    alunoId,
    nome: '',
    objetivo: '',
    dataInicio: '',
    dataFim: '',
    divisoes: [novaDivisao(0)],
    treinosRemovidos: [],
    itensRemovidos: [],
  };
}

function itemDoServidor(item: ItemFicha): ItemMontador {
  return {
    chave: novaChave('it'),
    id: item.id,
    exercicioId: item.exercicio_id,
    nome: item.nome,
    grupoMuscular: item.grupo_muscular,
    imagem: item.imagem,
    series: String(item.series),
    repeticoes: String(item.repeticoes),
    carga: item.carga ? String(item.carga) : '',
    descanso: String(item.descanso),
    observacao: item.observacao ?? '',
  };
}

/** Converte a resposta de GET /ficha/{id}/completa (ou conteúdo de versão) no estado local. */
export function fichaDoServidor(ficha: FichaCompleta): FichaMontador {
  const treinos = [...ficha.treinos].sort((a, b) => a.ordem - b.ordem);

  return {
    id: ficha.id,
    status: ficha.status ?? 'publicada',
    alunoId: ficha.aluno_id ?? null,
    nome: ficha.nome,
    objetivo: ficha.objetivo ?? '',
    dataInicio: formatarData(ficha.data_inicio),
    dataFim: ficha.data_fim ? formatarData(ficha.data_fim) : '',
    divisoes: treinos.map((treino) => ({
      chave: novaChave('div'),
      id: treino.id,
      nome: treino.nome,
      dia: treino.dia_semana,
      itens: [...treino.itens].sort((a, b) => a.ordem - b.ordem).map(itemDoServidor),
    })),
    treinosRemovidos: [],
    itensRemovidos: [],
  };
}

export function itemDoExercicio(exercicio: Exercicio): ItemMontador {
  return {
    chave: novaChave('it'),
    id: null,
    exercicioId: exercicio.id,
    nome: exercicio.nome,
    grupoMuscular: exercicio.grupo_muscular,
    imagem: exercicio.imagem,
    series: SERIES_PADRAO,
    repeticoes: REPETICOES_PADRAO,
    carga: '',
    descanso: DESCANSO_PADRAO,
    observacao: '',
  };
}

// ---------- Edição imutável ----------

function trocarDivisao(
  ficha: FichaMontador,
  indice: number,
  mudar: (divisao: DivisaoMontador) => DivisaoMontador
): FichaMontador {
  if (indice < 0 || indice >= ficha.divisoes.length) {
    return ficha;
  }

  return {
    ...ficha,
    divisoes: ficha.divisoes.map((d, i) => (i === indice ? mudar(d) : d)),
  };
}

export function adicionarDivisao(ficha: FichaMontador): FichaMontador {
  return { ...ficha, divisoes: [...ficha.divisoes, novaDivisao(ficha.divisoes.length)] };
}

/** Remove a divisão; se ela existia no servidor, registra para excluir ao salvar. */
export function removerDivisao(ficha: FichaMontador, indice: number): FichaMontador {
  const alvo = ficha.divisoes[indice];

  if (!alvo) {
    return ficha;
  }

  return {
    ...ficha,
    divisoes: ficha.divisoes.filter((_, i) => i !== indice),
    treinosRemovidos: alvo.id ? [...ficha.treinosRemovidos, alvo.id] : ficha.treinosRemovidos,
  };
}

export function atualizarDivisao(
  ficha: FichaMontador,
  indice: number,
  mudancas: Partial<Pick<DivisaoMontador, 'nome' | 'dia'>>
): FichaMontador {
  return trocarDivisao(ficha, indice, (d) => ({ ...d, ...mudancas }));
}

/** Move a divisão para cima (-1) ou para baixo (1). */
export function moverDivisao(
  ficha: FichaMontador,
  indice: number,
  direcao: -1 | 1
): FichaMontador {
  const destino = indice + direcao;

  if (destino < 0 || destino >= ficha.divisoes.length) {
    return ficha;
  }

  const divisoes = [...ficha.divisoes];

  [divisoes[indice], divisoes[destino]] = [divisoes[destino], divisoes[indice]];

  return { ...ficha, divisoes };
}

export function adicionarItem(
  ficha: FichaMontador,
  indiceDivisao: number,
  item: ItemMontador
): FichaMontador {
  return trocarDivisao(ficha, indiceDivisao, (d) => ({ ...d, itens: [...d.itens, item] }));
}

export function atualizarItem(
  ficha: FichaMontador,
  indiceDivisao: number,
  indiceItem: number,
  mudancas: Partial<
    Pick<ItemMontador, 'series' | 'repeticoes' | 'carga' | 'descanso' | 'observacao'>
  >
): FichaMontador {
  return trocarDivisao(ficha, indiceDivisao, (d) => ({
    ...d,
    itens: d.itens.map((it, i) => (i === indiceItem ? { ...it, ...mudancas } : it)),
  }));
}

export function removerItem(
  ficha: FichaMontador,
  indiceDivisao: number,
  indiceItem: number
): FichaMontador {
  const divisao = ficha.divisoes[indiceDivisao];
  const alvo = divisao?.itens[indiceItem];

  if (!divisao || !alvo) {
    return ficha;
  }

  const semAlvo = trocarDivisao(ficha, indiceDivisao, (d) => ({
    ...d,
    itens: d.itens.filter((_, i) => i !== indiceItem),
  }));

  return {
    ...semAlvo,
    itensRemovidos: alvo.id ? [...ficha.itensRemovidos, alvo.id] : ficha.itensRemovidos,
  };
}

/** Copia o item logo abaixo do original (sem id: vira item novo ao salvar). */
export function duplicarItem(
  ficha: FichaMontador,
  indiceDivisao: number,
  indiceItem: number
): FichaMontador {
  return trocarDivisao(ficha, indiceDivisao, (d) => {
    const original = d.itens[indiceItem];

    if (!original) {
      return d;
    }

    const copia: ItemMontador = { ...original, chave: novaChave('it'), id: null };
    const itens = [...d.itens];

    itens.splice(indiceItem + 1, 0, copia);

    return { ...d, itens };
  });
}

/** Sobe (-1) ou desce (1) o item dentro da divisão. */
export function moverItem(
  ficha: FichaMontador,
  indiceDivisao: number,
  indiceItem: number,
  direcao: -1 | 1
): FichaMontador {
  return trocarDivisao(ficha, indiceDivisao, (d) => {
    const destino = indiceItem + direcao;

    if (indiceItem < 0 || indiceItem >= d.itens.length || destino < 0 || destino >= d.itens.length) {
      return d;
    }

    const itens = [...d.itens];

    [itens[indiceItem], itens[destino]] = [itens[destino], itens[indiceItem]];

    return { ...d, itens };
  });
}

/** Duplica uma divisão inteira (treino e itens novos) logo depois dela, com nome "… (cópia)". */
export function duplicarDivisao(ficha: FichaMontador, indice: number): FichaMontador {
  const original = ficha.divisoes[indice];

  if (!original) {
    return ficha;
  }

  const copia: DivisaoMontador = {
    chave: novaChave('div'),
    id: null,
    nome: `${original.nome} (cópia)`,
    dia: null,
    itens: original.itens.map((it) => ({ ...it, chave: novaChave('it'), id: null })),
  };
  const divisoes = [...ficha.divisoes];

  divisoes.splice(indice + 1, 0, copia);

  return { ...ficha, divisoes };
}

// ---------- Validação ----------

export type ErrosItemMontador = Partial<
  Record<'series' | 'repeticoes' | 'carga' | 'descanso' | 'observacao', string>
>;

export interface ErrosMontador {
  aluno?: string;
  nome?: string;
  dataInicio?: string;
  dataFim?: string;
  /** Mensagem geral (ex.: ficha sem nenhum exercício ao publicar). */
  geral?: string;
  divisoes: { nome?: string; itens: ErrosItemMontador[] }[];
}

export const LIMITE_OBSERVACAO = 300;
export const LIMITE_OBJETIVO = 300;

export function errosDoItem(item: ItemMontador): ErrosItemMontador {
  const erros: ErrosItemMontador = {};

  if (!(lerNumero(item.series) >= 1)) {
    erros.series = 'Informe as séries.';
  }

  if (!(lerNumero(item.repeticoes) >= 1)) {
    erros.repeticoes = 'Informe as repetições.';
  }

  if (item.carga.trim() !== '' && !(lerNumero(item.carga) >= 0)) {
    erros.carga = 'Carga inválida.';
  }

  if (!(lerNumero(item.descanso) >= 1)) {
    erros.descanso = 'Informe o descanso (s).';
  }

  if (item.observacao.length > LIMITE_OBSERVACAO) {
    erros.observacao = `Máximo de ${LIMITE_OBSERVACAO} caracteres.`;
  }

  return erros;
}

/**
 * Valida a ficha. `exigirExercicios` (publicar): precisa de ao menos uma divisão com exercício.
 * Salvar rascunho exige o mínimo para existir no servidor: aluno e nome.
 */
export function validarMontador(
  ficha: FichaMontador,
  opcoes: { exigirExercicios?: boolean } = {}
): ErrosMontador {
  const erros: ErrosMontador = { divisoes: [] };

  if (!ficha.alunoId) {
    erros.aluno = 'Selecione o aluno.';
  }

  if (!ficha.nome.trim()) {
    erros.nome = 'Informe o nome da ficha.';
  }

  if (!dataBrValida(ficha.dataInicio)) {
    erros.dataInicio = 'Use o formato DD/MM/AAAA.';
  }

  if (!dataBrValida(ficha.dataFim)) {
    erros.dataFim = 'Use o formato DD/MM/AAAA.';
  }

  const inicio = dataBrParaIso(ficha.dataInicio);
  const fim = dataBrParaIso(ficha.dataFim);

  if (inicio && fim && fim < inicio && !erros.dataFim) {
    erros.dataFim = 'O fim não pode ser antes do início.';
  }

  if (ficha.objetivo.length > LIMITE_OBJETIVO) {
    erros.geral = `O objetivo aceita até ${LIMITE_OBJETIVO} caracteres.`;
  }

  erros.divisoes = ficha.divisoes.map((divisao) => ({
    nome: divisao.nome.trim() ? undefined : 'Informe o nome da divisão.',
    itens: divisao.itens.map(errosDoItem),
  }));

  if (opcoes.exigirExercicios) {
    const total = ficha.divisoes.reduce((soma, d) => soma + d.itens.length, 0);

    if (total === 0 && !erros.geral) {
      erros.geral = 'Adicione ao menos um exercício antes de publicar.';
    }
  }

  return erros;
}

export function temErrosMontador(erros: ErrosMontador): boolean {
  return (
    Boolean(erros.aluno || erros.nome || erros.dataInicio || erros.dataFim || erros.geral) ||
    erros.divisoes.some((d) => Boolean(d.nome) || d.itens.some((i) => Object.keys(i).length > 0))
  );
}

/** Primeira divisão (índice) com erro, para o montador abrir nela. */
export function primeiraDivisaoComErro(erros: ErrosMontador): number | null {
  const indice = erros.divisoes.findIndex(
    (d) => Boolean(d.nome) || d.itens.some((i) => Object.keys(i).length > 0)
  );

  return indice === -1 ? null : indice;
}

// ---------- Alterações não salvas ----------

/** Foto do que o usuário controla (sem chaves locais), para comparar com a base. */
export function assinatura(ficha: FichaMontador): string {
  return JSON.stringify({
    alunoId: ficha.alunoId,
    nome: ficha.nome,
    objetivo: ficha.objetivo,
    dataInicio: ficha.dataInicio,
    dataFim: ficha.dataFim,
    divisoes: ficha.divisoes.map((d) => ({
      id: d.id,
      nome: d.nome,
      dia: d.dia,
      itens: d.itens.map((i) => ({
        id: i.id,
        exercicioId: i.exercicioId,
        series: i.series,
        repeticoes: i.repeticoes,
        carga: i.carga,
        descanso: i.descanso,
        observacao: i.observacao,
      })),
    })),
    treinosRemovidos: ficha.treinosRemovidos,
    itensRemovidos: ficha.itensRemovidos,
  });
}

export function temAlteracoes(base: FichaMontador, atual: FichaMontador): boolean {
  return assinatura(base) !== assinatura(atual);
}

// ---------- O que mandar à API ----------

export interface DadosItemApi {
  series: number;
  repeticoes: number;
  carga: number;
  descanso: number;
  observacao: string | null;
}

export function dadosDoItem(item: ItemMontador): DadosItemApi {
  return {
    series: Math.trunc(lerNumero(item.series)),
    repeticoes: Math.trunc(lerNumero(item.repeticoes)),
    carga: lerCarga(item.carga),
    descanso: Math.trunc(lerNumero(item.descanso)),
    observacao: item.observacao.trim() || null,
  };
}

/**
 * Estado completo da ficha em formato de API (PUT /ficha/{id}/completa). A ordem de treinos e itens é o
 * índice + 1; ids existentes atualizam, ausentes criam, e o que sumir é removido no servidor.
 */
export function payloadFichaCompleta(ficha: FichaMontador): FichaCompletaAtualizar {
  return {
    ...dadosDaFicha(ficha),
    treinos: ficha.divisoes.map((divisao, indice) => ({
      ...(divisao.id ? { id: divisao.id } : {}),
      nome: divisao.nome.trim(),
      dia_semana: divisao.dia,
      ordem: indice + 1,
      itens: divisao.itens.map((item, posicao) => ({
        ...(item.id ? { id: item.id } : {}),
        exercicio_id: item.exercicioId,
        ordem: posicao + 1,
        ...dadosDoItem(item),
      })),
    })),
  };
}

/** Dados de ficha (POST/PUT) em formato de API. */
export function dadosDaFicha(ficha: FichaMontador) {
  const inicio = dataBrParaIso(ficha.dataInicio);
  const fim = dataBrParaIso(ficha.dataFim);

  return {
    nome: ficha.nome.trim(),
    objetivo: ficha.objetivo.trim() || null,
    ...(inicio ? { data_inicio: inicio } : {}),
    data_fim: fim,
  };
}

// ---------- Resumo e biblioteca ----------

export function totalExercicios(ficha: FichaMontador): number {
  return ficha.divisoes.reduce((soma, d) => soma + d.itens.length, 0);
}

/** "Treino A · Segunda" ou "Treino A · Sem dia fixo". */
export function resumoDivisao(divisao: DivisaoMontador, rotuloDia: (dia: string | null) => string): string {
  return `${divisao.nome.trim() || 'Divisão'} · ${rotuloDia(divisao.dia)}`;
}
