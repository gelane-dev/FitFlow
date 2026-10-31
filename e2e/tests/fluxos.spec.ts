import { expect, test, type Page } from '@playwright/test';

// Os cenários formam uma sequência: o E2E-01 cria o aluno que os demais usam.
test.describe.configure({ mode: 'serial' });
test.use({ baseURL: process.env.E2E_WEB_URL });

const SENHA_ALUNO = 'Aluno@12345';
const aluno = {
  nome: `Aluno E2E ${Date.now()}`,
  email: `aluno.e2e.${Date.now()}@example.com`,
  telefone: '11922223333',
  nascimento: '15/05/1995', // DD/MM/AAAA (a máscara do app converte para ISO)
};
const exercicios = [
  { nome: `Supino E2E ${Date.now()}`, grupo: 'Peito' },
  { nome: `Agachamento E2E ${Date.now()}`, grupo: 'Pernas' },
];
const FICHA = `Ficha E2E ${Date.now()}`;
const TREINO = 'Treino do dia E2E';
const NOVO_TELEFONE = '11977776666';

const professor = () => ({
  email: process.env.E2E_PROFESSOR_EMAIL!,
  senha: process.env.E2E_PROFESSOR_SENHA!,
});

// "Hoje" no fuso do servidor (APP_TIMEZONE padrão = America/Sao_Paulo).
const FUSO = 'America/Sao_Paulo';
function hojeIso(dias = 0): string {
  const data = new Date(Date.now() + dias * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(data);
}
function hojeBr(dias = 0): string {
  const [ano, mes, dia] = hojeIso(dias).split('-');
  return `${dia}/${mes}/${ano}`;
}
// Chips de dia da semana mostram a abreviação capitalizada (Seg, Ter, Qua, Qui, Sex, Sáb, Dom).
function rotuloChipDiaHoje(): string {
  const abreviado = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: FUSO })
    .format(new Date())
    .replace('.', '');
  return abreviado.charAt(0).toUpperCase() + abreviado.slice(1, 3);
}
async function login(page: Page, email: string, senha: string) {
  await page.goto('/');
  await page.getByPlaceholder('Digite seu e-mail', { exact: true }).filter({ visible: true }).fill(email);
  await page.getByPlaceholder('Digite sua senha', { exact: true }).filter({ visible: true }).fill(senha);
  await page.getByText('ENTRAR', { exact: true }).filter({ visible: true }).click();
}

// ADR-030 (adendo): os alertas são um modal do design system (testID `dialogo-alerta`), não mais
// window.alert/confirm. Um laço em segundo plano aceita todo alerta (o primeiro botão que não é
// "cancelar") e o registra como "Título + linha em branco + Mensagem", como os diálogos nativos eram registrados.
// Os testes conferem as mensagens esperadas e que nenhum alerta inesperado apareceu.
let dialogos: string[] = [];
let pararAceite: (() => Promise<void>) | undefined;

function aceitarAlertasDoApp(page: Page) {
  let ativo = true;
  const laco = (async () => {
    while (ativo) {
      try {
        const caixa = page.getByTestId('dialogo-alerta');
        if (await caixa.isVisible()) {
          const titulo = (await page.getByTestId('alerta-titulo').textContent()) ?? '';
          const mensagem = (await page.getByTestId('alerta-mensagem').count())
            ? ((await page.getByTestId('alerta-mensagem').textContent()) ?? '')
            : '';
          dialogos.push(mensagem ? [titulo, mensagem].join('\n\n') : titulo);
          await page
            .locator('[data-testid^="alerta-botao-"]:not([data-testid^="alerta-botao-cancel-"])')
            .first()
            .click({ timeout: 2000 });
          await page.waitForTimeout(250);
          continue;
        }
      } catch {
        // página navegando ou fechada: tenta de novo no próximo ciclo
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  })();
  return async () => {
    ativo = false;
    await laco;
  };
}

test.beforeEach(({ page }) => {
  dialogos = [];
  // Diálogos nativos do navegador não deveriam mais existir; se surgirem, ficam registrados.
  page.on('dialog', (d) => {
    dialogos.push(d.message());
    void d.accept();
  });
  pararAceite = aceitarAlertasDoApp(page);
});
test.afterEach(async () => {
  await pararAceite?.();
});
async function esperarDialogo(mensagem: string) {
  await expect.poll(() => dialogos, { message: 'diálogo esperado' }).toContain(mensagem);
  dialogos = dialogos.filter((m) => m !== mensagem);
}
function semDialogosPendentes() {
  expect(dialogos, 'diálogos inesperados').toEqual([]);
}

/** Espera a resposta da API de uma ação (além do efeito visível). */
function respostaApi(page: Page, metodo: string, caminho: RegExp) {
  return page.waitForResponse((r) => {
    const url = new URL(r.url());
    return r.request().method() === metodo && caminho.test(url.pathname);
  });
}

async function clicarVoltar(page: Page) {
  // Telas redesenhadas usam o botão com testID; as antigas, o texto "‹ Voltar".
  await page
    .getByTestId('botao-voltar')
    .or(page.getByText('‹ Voltar', { exact: true }))
    .filter({ visible: true })
    .first()
    .click();
}

/** Toca numa aba da barra inferior (ADR-031): "Início", "Alunos", "Fichas", "Exercícios", "Perfil"... */
async function irParaAba(page: Page, rotulo: string) {
  await page.getByTestId(`aba-${rotulo}`).filter({ visible: true }).click();
}

test('E2E-01 aluno se cadastra, faz login e cai em /aluno sem ficha', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Cadastre-se', { exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/cadastro$/);

  await page.getByPlaceholder('Digite seu nome', { exact: true }).filter({ visible: true }).fill(aluno.nome);
  await page.getByPlaceholder('Digite seu e-mail', { exact: true }).filter({ visible: true }).fill(aluno.email);
  await page.getByPlaceholder('Digite seu telefone', { exact: true }).filter({ visible: true }).fill(aluno.telefone);
  await page.getByPlaceholder('DD/MM/AAAA', { exact: true }).filter({ visible: true }).fill(aluno.nascimento);
  await page.getByPlaceholder('Digite sua senha', { exact: true }).filter({ visible: true }).fill(SENHA_ALUNO);
  await page.getByPlaceholder('Confirme sua senha', { exact: true }).filter({ visible: true }).fill(SENHA_ALUNO);

  const resposta = respostaApi(page, 'POST', /^\/cadastro$/);
  await page.getByText('CADASTRAR', { exact: true }).filter({ visible: true }).click();
  expect((await resposta).status()).toBe(200);

  await esperarDialogo('Cadastro realizado\n\nSua conta foi criada com sucesso.');
  // o próprio app volta ao login (router.replace('/'))
  await expect(page.getByText('ENTRAR', { exact: true }).filter({ visible: true })).toBeVisible();

  await login(page, aluno.email, SENHA_ALUNO);
  await expect(page).toHaveURL(/\/aluno$/);
  await expect(page.getByText(/^(Bom dia|Boa tarde|Boa noite), Aluno$/).filter({ visible: true })).toBeVisible();
  await expect(
    page.getByText('Você ainda não tem uma ficha vigente. Fale com seu professor.').filter({ visible: true }),
  ).toBeVisible();
  semDialogosPendentes();
});

test('E2E-02 professor cria exercícios, ficha com vigência, treino de hoje e 2 itens', async ({
  page,
}) => {
  await login(page, professor().email, professor().senha);
  await expect(page).toHaveURL(/\/painel$/);
  await irParaAba(page, 'Exercícios');
  await expect(page).toHaveURL(/\/exercicios$/);

  // Exercícios
  for (const ex of exercicios) {
    await page.getByText('+ NOVO EXERCÍCIO', { exact: true }).filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/exercicios\/novo$/);
    await page.getByPlaceholder('Digite o nome do exercício', { exact: true }).filter({ visible: true }).fill(ex.nome);
    await page.getByPlaceholder('Digite a descrição do exercício', { exact: true }).filter({ visible: true }).fill(`Descrição de ${ex.nome}`);
    await page.getByPlaceholder('Ex.: Peito, Costas, Pernas', { exact: true }).filter({ visible: true }).fill(ex.grupo);
    const resposta = respostaApi(page, 'POST', /^\/exercicios\/?$/);
    await page.getByText('SALVAR EXERCÍCIO', { exact: true }).filter({ visible: true }).click();
    expect((await resposta).status()).toBe(200);
    await esperarDialogo('Exercício criado\n\nO exercício foi criado com sucesso.');
    await expect(page).toHaveURL(/\/exercicios$/);
    await expect(page.getByText(ex.nome, { exact: true }).filter({ visible: true })).toBeVisible();
  }

  // Ficha com vigência (hoje → +30 dias) para o aluno
  await irParaAba(page, 'Fichas');
  await expect(page).toHaveURL(/\/fichas$/);
  await page.getByText('+ NOVA FICHA', { exact: true }).filter({ visible: true }).click();
  await page.getByPlaceholder('Ex.: Hipertrofia - ciclo 1', { exact: true }).filter({ visible: true }).fill(FICHA);
  await page.getByPlaceholder('DD/MM/AAAA (padrão: hoje)', { exact: true }).filter({ visible: true }).fill(hojeBr());
  await page.getByPlaceholder('DD/MM/AAAA', { exact: true }).filter({ visible: true }).fill(hojeBr(30));
  await page.getByText(aluno.nome, { exact: true }).filter({ visible: true }).click();
  const respostaFicha = respostaApi(page, 'POST', /^\/ficha\/?$/);
  await page.getByText('CRIAR FICHA', { exact: true }).filter({ visible: true }).click();
  expect((await respostaFicha).status()).toBe(200);

  await esperarDialogo('Ficha criada\n\nAgora você pode adicionar os treinos.');
  await expect(page.getByText(FICHA.toUpperCase(), { exact: true }).filter({ visible: true })).toBeVisible();

  // Treino com o dia de hoje
  await page.getByText('+ NOVO TREINO', { exact: true }).filter({ visible: true }).click();
  await page.getByPlaceholder('Ex.: Treino A', { exact: true }).filter({ visible: true }).fill(TREINO);
  await page.getByText(rotuloChipDiaHoje(), { exact: true }).filter({ visible: true }).click();
  const respostaTreino = respostaApi(page, 'POST', /^\/treino\/?$/);
  await page.getByText('CRIAR TREINO', { exact: true }).filter({ visible: true }).click();
  expect((await respostaTreino).status()).toBe(200);
  await esperarDialogo('Treino criado\n\nAgora monte os exercícios desta sessão.');
  await expect(page.getByText(TREINO.toUpperCase(), { exact: true }).filter({ visible: true })).toBeVisible();

  // 2 itens (um por exercício), 2 séries cada
  for (const ex of exercicios) {
    await page.getByText('+ ADICIONAR EXERCÍCIO', { exact: true }).filter({ visible: true }).click();
    await page.getByText('Selecionar exercício', { exact: true }).filter({ visible: true }).click();
    await page.getByText(ex.nome, { exact: true }).filter({ visible: true }).last().click();
    // o Modal anima a saída e mantém o foco preso na busca até sumir
    await expect(page.getByText('ESCOLHER EXERCÍCIO', { exact: true })).toHaveCount(0);
    await page.getByPlaceholder('3', { exact: true }).filter({ visible: true }).fill('2');
    await page.getByPlaceholder('12', { exact: true }).filter({ visible: true }).fill('10');
    await page.getByPlaceholder('opcional', { exact: true }).filter({ visible: true }).fill('50');
    await page.getByPlaceholder('60', { exact: true }).filter({ visible: true }).fill('45');
    const respostaItem = respostaApi(page, 'POST', /^\/ficha\/itens$/);
    await page.getByText('SALVAR EXERCÍCIO', { exact: true }).filter({ visible: true }).click();
    expect((await respostaItem).status()).toBe(200);
    await expect(page.getByText('Selecionar exercício', { exact: true }).filter({ visible: true })).toHaveCount(0);
  }
  await expect(page.getByText('SALVAR EXERCÍCIO', { exact: true }).filter({ visible: true })).toHaveCount(0);
  for (const ex of exercicios) {
    await expect(page.getByText(ex.nome, { exact: true }).filter({ visible: true })).toBeVisible();
  }
  semDialogosPendentes();
});

test('E2E-03 aluno executa o treino de hoje, vê o cronômetro e o histórico com esforço 7', async ({
  page,
}) => {
  await login(page, aluno.email, SENHA_ALUNO);
  await expect(page).toHaveURL(/\/aluno$/);

  await expect(page.getByText(FICHA, { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('Treino de hoje', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText(TREINO, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await page.getByTestId('botao-comecar-treino').filter({ visible: true }).click();

  // Pré-visualização (P-15): lista os exercícios antes de começar; "Começar treino" abre a execução.
  await expect(page).toHaveURL(/\/aluno\/treino\/\d+\/previa/);
  await expect(page.getByTestId('previa-treino').filter({ visible: true })).toBeVisible();
  await expect(page.getByText(exercicios[0].nome, { exact: false }).filter({ visible: true }).first()).toBeVisible();
  await page.getByTestId('botao-iniciar-treino').filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/aluno\/treino\/\d+$/);

  // Modo foco: o exercício atual aparece com a série 1 de 2 e a barra de progresso
  await expect(page.getByText('0 de 4 séries concluídas').filter({ visible: true })).toBeVisible();
  await expect(page.getByText(exercicios[0].nome, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByTestId('serie-atual').filter({ visible: true })).toContainText('Série 1 de 2');

  // 2 séries: após cada uma o cronômetro de descanso aparece (e é pulado)
  await page.getByTestId('botao-concluir-serie').filter({ visible: true }).click();
  await expect(page.getByText('DESCANSO', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('1 de 4 séries concluídas').filter({ visible: true })).toBeVisible();
  await page.getByText('Pular descanso', { exact: true }).filter({ visible: true }).click();
  await expect(page.getByTestId('serie-atual').filter({ visible: true })).toContainText('Série 2 de 2');
  await page.getByTestId('botao-concluir-serie').filter({ visible: true }).click();
  await expect(page.getByText('2 de 4 séries concluídas').filter({ visible: true })).toBeVisible();
  await expect(page.getByText('DESCANSO', { exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByText('Pular descanso', { exact: true }).filter({ visible: true }).click();

  // Finaliza com esforço 7 (tela de resumo)
  await page.getByTestId('botao-finalizar-treino').filter({ visible: true }).click();
  await expect(page.getByText('Esforço percebido (1 a 10)').filter({ visible: true })).toBeVisible();
  await page.getByTestId('esforco-7').filter({ visible: true }).click();
  await page.getByPlaceholder('Como foi o treino?', { exact: true }).filter({ visible: true }).fill('Treino E2E ok');
  await page.getByTestId('botao-finalizar').filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/aluno$/);

  // Hero do Início já mostra o treino de hoje como concluído, com "Treinar de novo" (I-04)
  await expect(page.getByText('Treino de hoje concluído ✓', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByTestId('botao-treinar-de-novo').filter({ visible: true })).toBeVisible();

  // Histórico
  await irParaAba(page, 'Histórico');
  await expect(page).toHaveURL(/\/aluno\/historico$/);
  await expect(page.getByText(TREINO, { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('7/10', { exact: true }).filter({ visible: true })).toBeVisible();
});

test('E2E-04 professor vê sessão e evolução do aluno e cria avaliação; aluno a enxerga', async ({
  page,
}) => {
  await login(page, professor().email, professor().senha);
  await expect(page).toHaveURL(/\/painel$/);
  await irParaAba(page, 'Alunos');
  await expect(page).toHaveURL(/\/alunos$/);
  await page.getByText(aluno.nome, { exact: true }).filter({ visible: true }).click();

  await expect(page.getByText(aluno.nome.toUpperCase(), { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText(TREINO, { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('Esforço: 7/10', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText(/Treino E2E ok/).filter({ visible: true })).toBeVisible();
  // evolução do exercício que teve séries registradas
  await expect(page.getByText(exercicios[0].nome, { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText(/Última carga 50 kg · máxima 50 kg · 2 registros/).filter({ visible: true })).toBeVisible();

  // Avaliação física
  await page.getByText('+ NOVA AVALIAÇÃO', { exact: true }).filter({ visible: true }).click();
  await page.getByPlaceholder('DD/MM/AAAA', { exact: true }).filter({ visible: true }).fill(hojeBr());
  await page.getByPlaceholder('Ex.: 72,5', { exact: true }).filter({ visible: true }).fill('72,5');
  await page.getByPlaceholder('Ex.: 1,75', { exact: true }).filter({ visible: true }).fill('1,75');
  const resposta = respostaApi(page, 'POST', /avaliac/);
  await page.getByText('SALVAR AVALIAÇÃO', { exact: true }).filter({ visible: true }).click();
  expect((await resposta).status()).toBe(200);
  await expect(page.getByText(/72,5 kg · 1,75 m · IMC/).filter({ visible: true })).toBeVisible();

  // O aluno vê a avaliação
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await login(page, aluno.email, SENHA_ALUNO);
  await expect(page).toHaveURL(/\/aluno$/);
  await irParaAba(page, 'Perfil');
  await page.getByText('Avaliações físicas', { exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/aluno\/avaliacoes$/);
  await expect(page.getByText('72,5 kg · 1,75 m').filter({ visible: true })).toBeVisible();
  await expect(page.getByText('23,67', { exact: true }).filter({ visible: true })).toBeVisible();
});

test('E2E-05 guarda: aluno logado que abre /fichas não vê a tela de fichas', async ({ page }) => {
  await login(page, aluno.email, SENHA_ALUNO);
  await expect(page).toHaveURL(/\/aluno$/);

  const chamadasFichasProfessor: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.origin === new URL(process.env.E2E_API_URL!).origin && url.pathname === '/ficha') {
      chamadasFichasProfessor.push(req.url());
    }
  });

  await page.goto('/fichas');
  // espera a sessão ser restaurada (tela do aluno ou aviso de rota inexistente)
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('+ NOVA FICHA', { exact: true }).filter({ visible: true })).toHaveCount(0);
  await expect(page.getByText('Montagem de treino', { exact: true }).filter({ visible: true })).toHaveCount(0);
  await expect(page.getByText('Carregando fichas...').filter({ visible: true })).toHaveCount(0);
  expect(chamadasFichasProfessor).toEqual([]);
  await expect(page).not.toHaveURL(/\/fichas$/);
});

test('E2E-06 sessão: recarregar mantém o login; token inválido volta ao login', async ({ page }) => {
  await login(page, aluno.email, SENHA_ALUNO);
  await expect(page).toHaveURL(/\/aluno$/);

  await page.reload();
  await expect(page.getByText(/^(Bom dia|Boa tarde|Boa noite), Aluno$/).filter({ visible: true })).toBeVisible();
  await expect(page).toHaveURL(/\/aluno$/);

  await page.evaluate(() => localStorage.setItem('access_token', 'token-invalido'));
  await page.reload();
  await expect(page.getByText('ENTRAR', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByPlaceholder('Digite seu e-mail', { exact: true }).filter({ visible: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeNull();
});

test('E2E-07 perfil: aluno troca o telefone e a mudança persiste', async ({ page }) => {
  await login(page, aluno.email, SENHA_ALUNO);
  await expect(page).toHaveURL(/\/aluno$/);
  await irParaAba(page, 'Perfil');
  await expect(page).toHaveURL(/\/perfil$/);

  const campoTelefone = page.getByPlaceholder('Telefone', { exact: true }).filter({ visible: true });
  await expect(campoTelefone).toHaveValue(aluno.telefone);
  await campoTelefone.fill(NOVO_TELEFONE);
  const resposta = respostaApi(page, 'PUT', /^\/perfil\/aluno$/);
  await page.getByText('SALVAR DADOS', { exact: true }).filter({ visible: true }).click();
  expect((await resposta).status()).toBe(200);
  await esperarDialogo('Sucesso\n\nDados atualizados.');

  await page.reload();
  await expect(page.getByPlaceholder('Telefone', { exact: true }).filter({ visible: true })).toHaveValue(NOVO_TELEFONE);

  // persistiu no servidor: o professor enxerga o novo telefone
  await page.evaluate(() => localStorage.clear());
  await login(page, professor().email, professor().senha);
  await irParaAba(page, 'Alunos');
  await expect(page.getByText(NOVO_TELEFONE, { exact: true }).filter({ visible: true })).toBeVisible();
});

const NOVO_EXERCICIO = `Remada E2E ${Date.now()}`;
const EXERCICIO_EXTERNO = `Rosca E2E ${Date.now()}`;

test('E2E-08 professor cria exercício, volta à lista e o novo aparece sem recarregar a página', async ({
  page,
  request,
}) => {
  await login(page, professor().email, professor().senha);
  await expect(page).toHaveURL(/\/painel$/);
  await irParaAba(page, 'Exercícios');
  await expect(page).toHaveURL(/\/exercicios$/);
  // marca o documento: se a página recarregar, a marca some
  await page.evaluate(() => ((window as unknown as { __marca: number }).__marca = 1));

  await page.getByText('+ NOVO EXERCÍCIO', { exact: true }).filter({ visible: true }).click();
  await page.getByPlaceholder('Digite o nome do exercício', { exact: true }).filter({ visible: true }).fill(NOVO_EXERCICIO);
  await page.getByPlaceholder('Digite a descrição do exercício', { exact: true }).filter({ visible: true }).fill('Remada curvada');
  await page.getByPlaceholder('Ex.: Peito, Costas, Pernas', { exact: true }).filter({ visible: true }).fill('Costas');
  await page.getByText('SALVAR EXERCÍCIO', { exact: true }).filter({ visible: true }).click();
  await esperarDialogo('Exercício criado\n\nO exercício foi criado com sucesso.');
  await expect(page).toHaveURL(/\/exercicios$/);
  await expect(page.getByText(NOVO_EXERCICIO, { exact: true }).filter({ visible: true })).toBeVisible();

  // recarga no foco: abre o detalhe, cria outro exercício por fora (API) e volta
  await page.getByText(NOVO_EXERCICIO, { exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/exercicios\/\d+$/);
  const api = process.env.E2E_API_URL!;
  const { access_token } = await (
    await request.post(`${api}/login`, { data: { email: professor().email, senha: professor().senha } })
  ).json();
  const criado = await request.post(`${api}/exercicios`, {
    headers: { Authorization: `Bearer ${access_token}` },
    data: { nome: EXERCICIO_EXTERNO, descricao: 'Rosca direta', grupo_muscular: 'Bíceps' },
  });
  expect(criado.status()).toBe(200);
  await clicarVoltar(page);
  await expect(page).toHaveURL(/\/exercicios$/);
  await expect(page.getByText(EXERCICIO_EXTERNO, { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText(NOVO_EXERCICIO, { exact: true }).filter({ visible: true })).toBeVisible();

  expect(await page.evaluate(() => (window as unknown as { __marca?: number }).__marca)).toBe(1);
  semDialogosPendentes();
});

test('E2E-09 professor reordena 2 itens com ↑/↓ e a ordem persiste após recarregar', async ({ page }) => {
  await login(page, professor().email, professor().senha);
  await irParaAba(page, 'Fichas');
  await page.getByText(FICHA, { exact: true }).filter({ visible: true }).first().click();
  await page.getByText(TREINO, { exact: true }).filter({ visible: true }).click();
  await expect(page.getByText(TREINO.toUpperCase(), { exact: true }).filter({ visible: true })).toBeVisible();

  const [a, b] = exercicios.map((e) => e.nome); // ordem de criação: a, b
  const ordemNaTela = async () => {
    const caixas = await Promise.all(
      [a, b].map(async (nome) => ({
        nome,
        y: (await page.getByText(nome, { exact: true }).filter({ visible: true }).boundingBox())!.y,
      })),
    );
    return caixas.sort((x, y) => x.y - y.y).map((c) => c.nome);
  };
  const reordenou = () => respostaApi(page, 'PUT', /^\/treino\/\d+\/itens\/ordem$/);

  await expect.poll(ordemNaTela).toEqual([a, b]);

  // ↓ no primeiro item: b passa a vir primeiro
  let resposta = reordenou();
  await page.getByText('↓', { exact: true }).filter({ visible: true }).click();
  expect((await resposta).status()).toBe(200);
  await expect.poll(ordemNaTela).toEqual([b, a]);

  await page.reload();
  await expect.poll(ordemNaTela).toEqual([b, a]);

  // ↑ no segundo item (a): volta à ordem original e persiste
  resposta = reordenou();
  await page.getByText('↑', { exact: true }).filter({ visible: true }).click();
  expect((await resposta).status()).toBe(200);
  await expect.poll(ordemNaTela).toEqual([a, b]);

  await page.reload();
  await expect.poll(ordemNaTela).toEqual([a, b]);
  semDialogosPendentes();
});

test('E2E-10 navegação por abas: professor vê o painel, troca de aba e sai do app com confirmação', async ({
  page,
}) => {
  await login(page, professor().email, professor().senha);
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByTestId('barra-abas').filter({ visible: true })).toBeVisible();
  await expect(page.getByText('Alunos recentes', { exact: true }).filter({ visible: true })).toBeVisible();

  await irParaAba(page, 'Perfil');
  await expect(page).toHaveURL(/\/perfil$/);
  await page.getByTestId('botao-sair').filter({ visible: true }).click();
  await esperarDialogo('Sair\n\nDeseja sair da sua conta?');

  await expect(page.getByText('ENTRAR', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByTestId('barra-abas')).toHaveCount(0);
  semDialogosPendentes();
});
