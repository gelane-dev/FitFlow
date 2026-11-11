import { Exercicio } from '@/types/exercicio.types';
import { FichaCompleta } from '@/types/ficha.types';
import {
  adicionarDivisao,
  adicionarItem,
  assinatura,
  atualizarDivisao,
  atualizarItem,
  dadosDaFicha,
  dadosDoItem,
  duplicarDivisao,
  duplicarItem,
  fichaDoServidor,
  fichaVazia,
  itemDoExercicio,
  letraDivisao,
  moverDivisao,
  moverItem,
  nomePadraoDivisao,
  payloadFichaCompleta,
  primeiraDivisaoComErro,
  removerDivisao,
  removerItem,
  temAlteracoes,
  temErrosMontador,
  totalExercicios,
  validarMontador,
} from '@/utils/montadorFicha';

const supino: Exercicio = {
  id: 10,
  nome: 'Supino reto',
  descricao: 'Peito',
  grupo_muscular: 'Peito',
  imagem: null,
  video: null,
};
const remada: Exercicio = { ...supino, id: 11, nome: 'Remada curvada', grupo_muscular: 'Costas' };
const agacho: Exercicio = { ...supino, id: 12, nome: 'Agachamento', grupo_muscular: 'Pernas' };

/** Ficha válida com 2 divisões (A: supino+remada, B: agachamento), ainda sem id. */
function fichaMontada() {
  let ficha = { ...fichaVazia(5), nome: 'Hipertrofia' };

  ficha = adicionarItem(ficha, 0, itemDoExercicio(supino));
  ficha = adicionarItem(ficha, 0, itemDoExercicio(remada));
  ficha = adicionarDivisao(ficha);
  ficha = adicionarItem(ficha, 1, itemDoExercicio(agacho));

  return ficha;
}

const servidor: FichaCompleta = {
  id: 7,
  nome: 'Hipertrofia',
  data_criacao: '2026-11-01T10:00:00-03:00',
  data_inicio: '2026-11-01',
  data_fim: null,
  vigente: true,
  aluno_id: 5,
  status: 'publicada',
  objetivo: 'Ganho de massa',
  treinos: [
    {
      id: 100,
      ficha_id: 7,
      nome: 'Treino A',
      dia_semana: 'segunda',
      ordem: 1,
      total_itens: 2,
      itens: [
        {
          id: 1000,
          ficha_id: 7,
          treino_id: 100,
          exercicio_id: 10,
          series: 3,
          repeticoes: 12,
          carga: 20,
          descanso: 60,
          ordem: 1,
          nome: 'Supino reto',
          descricao: '',
          grupo_muscular: 'Peito',
          imagem: null,
          video: null,
          observacao: 'lento',
        },
        {
          id: 1001,
          ficha_id: 7,
          treino_id: 100,
          exercicio_id: 11,
          series: 4,
          repeticoes: 10,
          carga: 0,
          descanso: 90,
          ordem: 2,
          nome: 'Remada curvada',
          descricao: '',
          grupo_muscular: 'Costas',
          imagem: null,
          video: null,
        },
      ],
    },
    { id: 101, ficha_id: 7, nome: 'Treino B', dia_semana: null, ordem: 2, total_itens: 0, itens: [] },
  ],
};

describe('nomes das divisões', () => {
  it('gera A, B... Z, AA', () => {
    expect(letraDivisao(0)).toBe('A');
    expect(letraDivisao(2)).toBe('C');
    expect(letraDivisao(25)).toBe('Z');
    expect(letraDivisao(26)).toBe('AA');
    expect(nomePadraoDivisao(1)).toBe('Treino B');
  });

  it('adicionarDivisao usa a próxima letra e começa sem dia fixo', () => {
    const ficha = adicionarDivisao(adicionarDivisao(fichaVazia()));

    expect(ficha.divisoes.map((d) => d.nome)).toEqual(['Treino A', 'Treino B', 'Treino C']);
    expect(ficha.divisoes.every((d) => d.dia === null)).toBe(true);
  });
});

describe('itens: adicionar, reordenar, duplicar, remover', () => {
  it('adiciona o exercício com os padrões', () => {
    const item = itemDoExercicio(supino);

    expect(item).toMatchObject({
      id: null,
      exercicioId: 10,
      series: '3',
      repeticoes: '12',
      carga: '',
      descanso: '60',
      observacao: '',
    });
  });

  it('sobe e desce trocando só vizinhos; nos limites não muda nada', () => {
    const ficha = fichaMontada();
    const nomes = (f: typeof ficha) => f.divisoes[0].itens.map((i) => i.nome);

    expect(nomes(moverItem(ficha, 0, 0, 1))).toEqual(['Remada curvada', 'Supino reto']);
    expect(nomes(moverItem(ficha, 0, 1, -1))).toEqual(['Remada curvada', 'Supino reto']);
    expect(nomes(moverItem(ficha, 0, 0, -1))).toEqual(['Supino reto', 'Remada curvada']);
    expect(nomes(moverItem(ficha, 0, 1, 1))).toEqual(['Supino reto', 'Remada curvada']);
  });

  it('não altera o estado original (imutável)', () => {
    const ficha = fichaMontada();
    const antes = assinatura(ficha);

    moverItem(ficha, 0, 0, 1);
    removerItem(ficha, 0, 0);
    duplicarItem(ficha, 0, 0);

    expect(assinatura(ficha)).toBe(antes);
  });

  it('duplica o item logo abaixo, sem id e com chave nova', () => {
    const ficha = fichaMontada();
    const nova = duplicarItem(ficha, 0, 0);
    const itens = nova.divisoes[0].itens;

    expect(itens.map((i) => i.nome)).toEqual(['Supino reto', 'Supino reto', 'Remada curvada']);
    expect(itens[1].id).toBeNull();
    expect(itens[1].chave).not.toBe(itens[0].chave);
  });

  it('duplicar copia os dados editados do item', () => {
    let ficha = fichaMontada();

    ficha = atualizarItem(ficha, 0, 0, { series: '5', observacao: 'pausa' });
    ficha = duplicarItem(ficha, 0, 0);

    expect(ficha.divisoes[0].itens[1]).toMatchObject({ series: '5', observacao: 'pausa' });
  });

  it('remover item existente registra o id; item novo some sem registro', () => {
    const base = fichaDoServidor(servidor);
    const semExistente = removerItem(base, 0, 0);

    expect(semExistente.itensRemovidos).toEqual([1000]);
    expect(semExistente.divisoes[0].itens).toHaveLength(1);

    const novo = adicionarItem(base, 0, itemDoExercicio(agacho));
    const semNovo = removerItem(novo, 0, 2);

    expect(semNovo.itensRemovidos).toEqual([]);
  });

  it('índices inválidos são ignorados', () => {
    const ficha = fichaMontada();

    expect(removerItem(ficha, 9, 0)).toBe(ficha);
    expect(removerItem(ficha, 0, 9)).toBe(ficha);
    expect(duplicarItem(ficha, 0, 9).divisoes[0].itens).toHaveLength(2);
    expect(atualizarItem(ficha, 9, 0, { series: '1' })).toBe(ficha);
  });
});

describe('divisões: mover, duplicar, remover', () => {
  it('troca a ordem das divisões', () => {
    const ficha = moverDivisao(fichaMontada(), 0, 1);

    expect(ficha.divisoes.map((d) => d.nome)).toEqual(['Treino B', 'Treino A']);
    expect(moverDivisao(ficha, 0, -1)).toBe(ficha);
  });

  it('duplica a divisão com itens novos e nome "(cópia)", sem dia', () => {
    let ficha = fichaMontada();

    ficha = atualizarDivisao(ficha, 0, { dia: 'segunda' });
    ficha = duplicarDivisao(ficha, 0);

    expect(ficha.divisoes).toHaveLength(3);
    expect(ficha.divisoes[1].nome).toBe('Treino A (cópia)');
    expect(ficha.divisoes[1].dia).toBeNull();
    expect(ficha.divisoes[1].id).toBeNull();
    expect(ficha.divisoes[1].itens.map((i) => i.nome)).toEqual(['Supino reto', 'Remada curvada']);
    expect(ficha.divisoes[1].itens.every((i) => i.id === null)).toBe(true);
  });

  it('remover divisão existente registra o treino; a nova some sem registro', () => {
    const base = fichaDoServidor(servidor);

    expect(removerDivisao(base, 1).treinosRemovidos).toEqual([101]);
    expect(removerDivisao(adicionarDivisao(base), 2).treinosRemovidos).toEqual([]);
  });

  it('totalExercicios soma todas as divisões', () => {
    expect(totalExercicios(fichaMontada())).toBe(3);
  });
});

describe('fichaDoServidor', () => {
  it('converte datas, ordena e traduz números em texto; carga 0 vira vazio', () => {
    const ficha = fichaDoServidor(servidor);

    expect(ficha).toMatchObject({
      id: 7,
      status: 'publicada',
      alunoId: 5,
      objetivo: 'Ganho de massa',
      dataInicio: '01/11/2026',
      dataFim: '',
    });
    expect(ficha.divisoes[0]).toMatchObject({ id: 100, dia: 'segunda' });
    expect(ficha.divisoes[1].dia).toBeNull();
    expect(ficha.divisoes[0].itens[0]).toMatchObject({ id: 1000, carga: '20', observacao: 'lento' });
    expect(ficha.divisoes[0].itens[1].carga).toBe('');
  });
});

describe('validarMontador', () => {
  it('ficha completa não tem erros', () => {
    expect(temErrosMontador(validarMontador(fichaMontada(), { exigirExercicios: true }))).toBe(false);
  });

  it('exige aluno e nome', () => {
    const erros = validarMontador(fichaVazia());

    expect(erros.aluno).toBe('Selecione o aluno.');
    expect(erros.nome).toBe('Informe o nome da ficha.');
    expect(temErrosMontador(erros)).toBe(true);
  });

  it('publicar exige ao menos um exercício; rascunho aceita vazio', () => {
    const vazia = { ...fichaVazia(5), nome: 'X' };

    expect(temErrosMontador(validarMontador(vazia))).toBe(false);
    expect(validarMontador(vazia, { exigirExercicios: true }).geral).toMatch(/ao menos um exercício/);
  });

  it('valida datas e a ordem início/fim', () => {
    const base = { ...fichaVazia(5), nome: 'X' };

    expect(validarMontador({ ...base, dataInicio: '31/02/2026' }).dataInicio).toBeDefined();
    expect(validarMontador({ ...base, dataInicio: '10/11/2026', dataFim: '01/11/2026' }).dataFim).toMatch(
      /antes do início/
    );
    expect(temErrosMontador(validarMontador({ ...base, dataInicio: '01/11/2026', dataFim: '10/11/2026' }))).toBe(
      false
    );
  });

  it('valida nome da divisão e campos do item, e acha a primeira divisão com erro', () => {
    let ficha = fichaMontada();

    ficha = atualizarDivisao(ficha, 1, { nome: '  ' });
    ficha = atualizarItem(ficha, 0, 1, { series: '0', repeticoes: '', descanso: 'x', carga: '-5' });

    const erros = validarMontador(ficha);

    expect(erros.divisoes[1].nome).toBe('Informe o nome da divisão.');
    expect(erros.divisoes[0].itens[1]).toEqual({
      series: 'Informe as séries.',
      repeticoes: 'Informe as repetições.',
      carga: 'Carga inválida.',
      descanso: 'Informe o descanso (s).',
    });
    expect(erros.divisoes[0].itens[0]).toEqual({});
    expect(primeiraDivisaoComErro(erros)).toBe(0);
    expect(primeiraDivisaoComErro(validarMontador(fichaMontada()))).toBeNull();
  });

  it('limita a observação a 300 caracteres', () => {
    const ficha = atualizarItem(fichaMontada(), 0, 0, { observacao: 'a'.repeat(301) });

    expect(validarMontador(ficha).divisoes[0].itens[0].observacao).toMatch(/300/);
  });
});

describe('alterações não salvas', () => {
  it('detecta qualquer mudança e volta a "limpo" ao desfazer', () => {
    const base = fichaDoServidor(servidor);

    expect(temAlteracoes(base, base)).toBe(false);

    const editada = atualizarItem(base, 0, 0, { series: '5' });

    expect(temAlteracoes(base, editada)).toBe(true);
    expect(temAlteracoes(base, atualizarItem(editada, 0, 0, { series: '3' }))).toBe(false);
    expect(temAlteracoes(base, { ...base, nome: 'Outro' })).toBe(true);
    expect(temAlteracoes(base, removerItem(base, 0, 0))).toBe(true);
  });

  it('ignora chaves locais (recarregar do servidor não conta como alteração)', () => {
    expect(temAlteracoes(fichaDoServidor(servidor), fichaDoServidor(servidor))).toBe(false);
  });
});

describe('dados para a API', () => {
  it('dadosDoItem converte texto, aceita vírgula e trata carga vazia como 0', () => {
    const item = { ...itemDoExercicio(supino), carga: '12,5', observacao: '  ok  ' };

    expect(dadosDoItem(item)).toEqual({
      series: 3,
      repeticoes: 12,
      carga: 12.5,
      descanso: 60,
      observacao: 'ok',
    });
    expect(dadosDoItem({ ...item, carga: '', observacao: '  ' })).toMatchObject({ carga: 0, observacao: null });
  });

  it('dadosDaFicha converte datas BR para ISO e objetivo vazio vira null', () => {
    const ficha = { ...fichaVazia(5), nome: ' Plano ', dataInicio: '02/11/2026', dataFim: '' };

    expect(dadosDaFicha(ficha)).toEqual({
      nome: 'Plano',
      objetivo: null,
      data_inicio: '2026-11-02',
      data_fim: null,
    });
    expect(dadosDaFicha({ ...ficha, dataInicio: '' })).not.toHaveProperty('data_inicio');
  });
});

describe('payloadFichaCompleta (estado completo para a API)', () => {
  it('ficha nova: treinos e itens sem id, com ordem = posição + 1', () => {
    const payload = payloadFichaCompleta(fichaMontada());

    expect(payload.treinos.map((t) => [t.id, t.ordem])).toEqual([
      [undefined, 1],
      [undefined, 2],
    ]);
    expect(payload.treinos[0].itens.map((i) => [i.id, i.exercicio_id, i.ordem])).toEqual([
      [undefined, 10, 1],
      [undefined, 11, 2],
    ]);
    expect(payload.treinos[1].itens.map((i) => i.exercicio_id)).toEqual([12]);
  });

  it('ficha existente: ids preservados e ordem refletindo movimentos, edições e itens novos', () => {
    const base = fichaDoServidor(servidor);
    let atual = atualizarItem(base, 0, 0, { series: '5' });

    atual = moverItem(atual, 0, 0, 1);
    atual = duplicarItem(atual, 0, 0);

    const itens = payloadFichaCompleta(atual).treinos[0].itens;

    expect(itens.map((i) => [i.id, i.ordem])).toEqual([
      [1001, 1],
      [undefined, 2],
      [1000, 3],
    ]);
    expect(itens[2]).toMatchObject({ series: 5 });
  });

  it('divisão removida não vai no payload; dia vazio vira null', () => {
    const base = fichaDoServidor(servidor);
    const payload = payloadFichaCompleta(atualizarDivisao(removerDivisao(base, 1), 0, { dia: null }));

    expect(payload.treinos).toHaveLength(1);
    expect(payload.treinos[0]).toMatchObject({ id: 100, dia_semana: null, ordem: 1 });
  });

  it('inclui os dados da ficha', () => {
    const payload = payloadFichaCompleta({ ...fichaMontada(), nome: ' Plano ', objetivo: '' });

    expect(payload).toMatchObject({ nome: 'Plano', objetivo: null, data_fim: null });
  });
});
