import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

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

// ---------------------------------------------------------------------------------------------
// E2E-11 — aba Evolução (EV-04). Dados criados pelo próprio cenário (aluno novo + aluno sem dados),
// com datas relativas a "hoje" e valores calculados à mão (veja os comentários de cada bloco).
// ---------------------------------------------------------------------------------------------

type Metodo = 'GET' | 'POST';
async function chamarApi(
  request: APIRequestContext,
  metodo: Metodo,
  caminho: string,
  opcoes: { token?: string; dados?: unknown } = {},
) {
  const r = await request.fetch(`${process.env.E2E_API_URL}${caminho}`, {
    method: metodo,
    headers: opcoes.token ? { Authorization: `Bearer ${opcoes.token}` } : undefined,
    data: opcoes.dados,
  });
  const texto = await r.text();
  return { status: r.status(), corpo: texto ? JSON.parse(texto) : null };
}
async function loginApi(request: APIRequestContext, email: string, senha: string): Promise<string> {
  const r = await chamarApi(request, 'POST', '/login', { dados: { email, senha } });
  expect(r.status, `login de ${email}`).toBe(200);
  return r.corpo.access_token;
}

const SUFIXO_EVO = Date.now();
const alunoEvo = { nome: `Aluno Evo ${SUFIXO_EVO}`, email: `aluno.evo.${SUFIXO_EVO}@example.com` };
const alunoVazio = { nome: `Aluno Vazio ${SUFIXO_EVO}`, email: `aluno.vazio.${SUFIXO_EVO}@example.com` };

// Registros (dias antes de hoje, séries, repetições, carga). Contas à mão, por dia:
//  Supino: -40 → 3×10×40 = 1200 | -20 → 3×8×50 + 2×12×45 = 1200 + 1080 = 2280 (carga 50, reps 12, séries 5, 2 registros)
//          -10 → 4×6×55 = 1320 | -3 → 3×10×55 = 1650 | 0 → 3×12×52,5 = 1890
//  Remada: -7 e -6 → 3×10×30 = 900 cada (valores iguais; -7 fica fora de "7 dias", -6 dentro)
//  Rosca:  -100 → 3×10×20 = 600 (um único ponto; fora de "3 meses", dentro de "6 meses")
const REGISTROS_EVO = {
  supino: [
    [-40, 3, 10, 40],
    [-20, 3, 8, 50],
    [-20, 2, 12, 45],
    [-10, 4, 6, 55],
    [-3, 3, 10, 55],
    [0, 3, 12, 52.5],
  ],
  remada: [
    [-7, 3, 10, 30],
    [-6, 3, 10, 30],
  ],
  rosca: [[-100, 3, 10, 20]],
} as const;
// Avaliações (dias antes de hoje, peso, gordura, massa muscular, observação); altura 1,80 em todas.
// IMC = peso / 3,24: 80 → 24,69 | 78 → 24,07 | 76,5 → 23,61
const AVALIACOES_EVO = [
  [-60, 80, 25, 40, 'Inicial E2E'],
  [-30, 78, null, 41, null],
  [-5, 76.5, 22, null, null],
] as const;

const PONTOS_SUPINO = [
  { data: -40, carga_maxima: 40, volume: 1200, registros: 1, repeticoes_maximas: 10, series: 3 },
  { data: -20, carga_maxima: 50, volume: 2280, registros: 2, repeticoes_maximas: 12, series: 5 },
  { data: -10, carga_maxima: 55, volume: 1320, registros: 1, repeticoes_maximas: 6, series: 4 },
  { data: -3, carga_maxima: 55, volume: 1650, registros: 1, repeticoes_maximas: 10, series: 3 },
  { data: 0, carga_maxima: 52.5, volume: 1890, registros: 1, repeticoes_maximas: 12, series: 3 },
].map((p) => ({ ...p, data: hojeIso(p.data) }));

const idsEvo: { supino: number; remada: number; rosca: number; avaliacoes: number[]; alunoVazioToken: string } = {
  supino: 0,
  remada: 0,
  rosca: 0,
  avaliacoes: [],
  alunoVazioToken: '',
};

async function semearEvolucao(request: APIRequestContext) {
  const prof = await loginApi(request, professor().email, professor().senha);
  for (const a of [alunoEvo, alunoVazio]) {
    const r = await chamarApi(request, 'POST', '/cadastro', {
      dados: { nome: a.nome, email: a.email, senha: SENHA_ALUNO, telefone: '11933334444', data_nascimento: '1990-01-01' },
    });
    expect(r.status).toBe(200);
  }
  const alunos = (await chamarApi(request, 'GET', '/alunos', { token: prof })).corpo as { id: number; nome: string }[];
  const alunoId = alunos.find((a) => a.nome === alunoEvo.nome)!.id;

  const exercicio = async (nome: string, grupo: string) => {
    const r = await chamarApi(request, 'POST', '/exercicios', {
      token: prof,
      dados: { nome, descricao: `Descrição de ${nome}`, grupo_muscular: grupo },
    });
    expect(r.status).toBe(200);
    return r.corpo.id as number;
  };
  idsEvo.supino = await exercicio(`Supino Evo ${SUFIXO_EVO}`, 'Peito');
  idsEvo.remada = await exercicio(`Remada Evo ${SUFIXO_EVO}`, 'Costas');
  idsEvo.rosca = await exercicio(`Rosca Evo ${SUFIXO_EVO}`, 'Bíceps');

  const ficha = await chamarApi(request, 'POST', '/ficha', {
    token: prof,
    dados: { aluno_id: alunoId, nome: `Ficha Evo ${SUFIXO_EVO}`, data_inicio: hojeIso(-120), data_fim: hojeIso(30) },
  });
  expect(ficha.status).toBe(200);
  const treino = await chamarApi(request, 'POST', '/treino', {
    token: prof,
    dados: { ficha_id: ficha.corpo.id, nome: 'Treino Evo', dia_semana: 'segunda', ordem: 1 },
  });
  expect(treino.status).toBe(200);

  const aluno = await loginApi(request, alunoEvo.email, SENHA_ALUNO);
  const porExercicio = { supino: idsEvo.supino, remada: idsEvo.remada, rosca: idsEvo.rosca } as const;
  let ordem = 1;
  for (const chave of ['supino', 'remada', 'rosca'] as const) {
    const item = await chamarApi(request, 'POST', '/ficha/itens', {
      token: prof,
      dados: {
        ficha_id: ficha.corpo.id,
        treino_id: treino.corpo.id,
        exercicio_id: porExercicio[chave],
        series: 3,
        repeticoes: 10,
        carga: 20,
        descanso: 60,
        ordem: ordem++,
      },
    });
    expect(item.status).toBe(200);
    for (const [dias, series, reps, carga] of REGISTROS_EVO[chave]) {
      const r = await chamarApi(request, 'POST', '/ficha/treino', {
        token: aluno,
        dados: {
          item_ficha_id: item.corpo.id,
          data_execucao: `${hojeIso(dias)}T12:00:00`,
          series_realizadas: series,
          repeticoes_realizadas: reps,
          carga_utilizada: carga,
          observacao: null,
        },
      });
      expect(r.status).toBe(200);
    }
  }
  for (const [dias, peso, gordura, massa, observacao] of AVALIACOES_EVO) {
    const r = await chamarApi(request, 'POST', `/alunos/${alunoId}/avaliacoes`, {
      token: prof,
      dados: {
        data_avaliacao: `${hojeIso(dias)}T09:00:00`,
        peso,
        altura: 1.8,
        percentual_gordura: gordura,
        massa_muscular: massa,
        observacao,
      },
    });
    expect(r.status).toBe(200);
    idsEvo.avaliacoes.push(r.corpo.id);
  }
  idsEvo.alunoVazioToken = await loginApi(request, alunoVazio.email, SENHA_ALUNO);
  return { prof, aluno, alunoId };
}

const vis = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });
const regexValor = (numero: string, unidade: string) => new RegExp(`^${numero}\\s*${unidade}$`);

async function abrirEvolucao(page: Page) {
  await irParaAba(page, 'Evolução');
  await expect(page).toHaveURL(/\/aluno\/evolucao$/);
  await expect(vis(page, 'tela-evolucao')).toBeVisible();
}
/** Contém o valor (os indicadores "Último × anterior" têm rótulo e data além do valor). */
const contemValor = (numero: string, unidade: string) => new RegExp(`${numero}\\s*${unidade}`);

/** Confere o valor/data do ponto que o aluno tocou no gráfico (leitura embutida no gráfico). */
async function esperarSelecao(page: Page, grafico: string, valor: RegExp, data: string) {
  await expect(page.getByTestId(`${grafico}-valor`)).toHaveText(valor);
  await expect(page.getByTestId(`${grafico}-data`)).toHaveText(data);
}

/** Confere o valor atual e a data no cabeçalho do cartão (uma vez só, sem repetir no gráfico). */
async function esperarAtual(page: Page, base: string, valor: RegExp, data: string) {
  await expect(vis(page, `${base}-atual`)).toHaveText(valor);
  await expect(vis(page, `${base}-data`)).toHaveText(data);
}

/** Alternador interno da aba Evolução (EV-05): Treinos | Corpo. */
async function abrirLado(page: Page, lado: 'treinos' | 'corpo') {
  await vis(page, `segmento-${lado}`).click();
  // aba selecionada acessível (aria-selected na web) e conteúdo do lado escolhido visível
  await expect(vis(page, `segmento-${lado}`)).toHaveAttribute('aria-selected', 'true');
  await expect(vis(page, lado === 'treinos' ? 'secao-treinos' : 'secao-fisica')).toBeVisible();
}

test('E2E-11 aba Evolução: filtros, gráficos, comparações, avaliações, estados vazios e erros por seção', async ({
  page,
  request,
}) => {
  test.setTimeout(300_000);
  const { prof, alunoId } = await semearEvolucao(request);

  await test.step('API: pontos e comparação batem com as contas à mão; períodos e janela', async () => {
    const aluno = await loginApi(request, alunoEvo.email, SENHA_ALUNO);
    const tudo = await chamarApi(request, 'GET', `/evolucao/exercicios/${idsEvo.supino}`, { token: aluno });
    expect(tudo.status).toBe(200);
    expect(tudo.corpo.periodo).toBeNull();
    expect(tudo.corpo.pontos).toEqual(PONTOS_SUPINO);
    expect(tudo.corpo.comparacao).toEqual({ atual: PONTOS_SUPINO[4], anterior: PONTOS_SUPINO[3] });

    const quantos: Record<string, number> = { '7d': 2, '30d': 4, '3m': 5, '6m': 5, '1a': 5 };
    for (const [periodo, n] of Object.entries(quantos)) {
      const r = await chamarApi(request, 'GET', `/evolucao/exercicios/${idsEvo.supino}?periodo=${periodo}`, {
        token: aluno,
      });
      expect(r.status).toBe(200);
      expect(r.corpo.periodo).toBe(periodo);
      expect(r.corpo.pontos, `Supino ${periodo}`).toEqual(PONTOS_SUPINO.slice(PONTOS_SUPINO.length - n));
      // a comparação ignora o período
      expect(r.corpo.comparacao).toEqual({ atual: PONTOS_SUPINO[4], anterior: PONTOS_SUPINO[3] });
    }

    // limite da janela: "7d" = hoje e os 6 dias anteriores → -6 entra, -7 fica de fora
    const remada7 = await chamarApi(request, 'GET', `/evolucao/exercicios/${idsEvo.remada}?periodo=7d`, {
      token: aluno,
    });
    expect(remada7.corpo.pontos.map((p: { data: string }) => p.data)).toEqual([hojeIso(-6)]);
    const remada30 = await chamarApi(request, 'GET', `/evolucao/exercicios/${idsEvo.remada}?periodo=30d`, {
      token: aluno,
    });
    expect(remada30.corpo.pontos).toHaveLength(2);

    // período vazio: 200 com pontos [] e comparação preenchida (histórico único → anterior null)
    const rosca3m = await chamarApi(request, 'GET', `/evolucao/exercicios/${idsEvo.rosca}?periodo=3m`, {
      token: aluno,
    });
    expect(rosca3m.status).toBe(200);
    expect(rosca3m.corpo.pontos).toEqual([]);
    expect(rosca3m.corpo.comparacao.anterior).toBeNull();
    expect(rosca3m.corpo.comparacao.atual).toMatchObject({ data: hojeIso(-100), carga_maxima: 20, volume: 600 });
    const rosca6m = await chamarApi(request, 'GET', `/evolucao/exercicios/${idsEvo.rosca}?periodo=6m`, {
      token: aluno,
    });
    expect(rosca6m.corpo.pontos).toHaveLength(1);
  });

  await test.step('API: 401/403/404/422 e isolamento entre alunos', async () => {
    const vazio = idsEvo.alunoVazioToken;
    const aluno = await loginApi(request, alunoEvo.email, SENHA_ALUNO);
    expect((await chamarApi(request, 'GET', '/evolucao/exercicios')).status).toBe(401);
    expect((await chamarApi(request, 'GET', '/evolucao/exercicios', { token: 'token-invalido' })).status).toBe(401);
    // professor nas rotas do aluno e aluno nas rotas do professor → 403
    expect((await chamarApi(request, 'GET', '/evolucao/exercicios', { token: prof })).status).toBe(403);
    expect((await chamarApi(request, 'GET', `/alunos/${alunoId}/evolucao/exercicios`, { token: vazio })).status).toBe(
      403,
    );
    // período inválido → 422 (também em caixa alta e vazio)
    for (const valor of ['2d', '7D', '']) {
      const r = await chamarApi(request, 'GET', `/evolucao/exercicios/${idsEvo.supino}?periodo=${valor}`, {
        token: aluno,
      });
      expect(r.status, `periodo="${valor}"`).toBe(422);
    }
    const periodoRuimProfessor = await chamarApi(
      request,
      'GET',
      `/alunos/${alunoId}/evolucao/exercicios/${idsEvo.supino}?periodo=2d`,
      { token: prof },
    );
    expect(periodoRuimProfessor.status).toBe(422);
    // aluno sem dados: listas vazias; exercício de outro aluno → 404 (sem vazar dados)
    expect((await chamarApi(request, 'GET', '/evolucao/exercicios', { token: vazio })).corpo).toEqual([]);
    expect((await chamarApi(request, 'GET', '/avaliacoes', { token: vazio })).corpo).toEqual([]);
    const alheio = await chamarApi(request, 'GET', `/evolucao/exercicios/${idsEvo.supino}`, { token: vazio });
    expect(alheio.status).toBe(404);
    expect(alheio.corpo.detail).toBe('Sem registros para este exercício');
    // professor: aluno inexistente → 404; aluno existente com período → 200
    const inexistente = await chamarApi(request, 'GET', '/alunos/999999/evolucao/exercicios', { token: prof });
    expect(inexistente.status).toBe(404);
    expect(inexistente.corpo.detail).toBe('Aluno não encontrado');
    const doProfessor = await chamarApi(
      request,
      'GET',
      `/alunos/${alunoId}/evolucao/exercicios/${idsEvo.supino}?periodo=30d`,
      { token: prof },
    );
    expect(doProfessor.status).toBe(200);
    expect(doProfessor.corpo.pontos).toHaveLength(4);
  });

  await test.step('UI: resumo, gráfico, métricas, períodos, ponto tocado, comparação e histórico', async () => {
    await login(page, alunoEvo.email, SENHA_ALUNO);
    await expect(page).toHaveURL(/\/aluno$/);
    await abrirEvolucao(page);

    // Resumo: 3 exercícios, 2 de 3 com a carga em alta (Remada e Rosca; o Supino fechou abaixo do máximo), peso atual
    await expect(vis(page, 'resumo-evolucao')).toHaveText(
      /3\s*Exercícios\s*2 de 3\s*Cargas em alta\s*76,5\s*kg\s*Peso atual/,
    );

    // Exercício padrão = o de registro mais recente (Supino); período "Tudo"; métrica Carga
    await expect(vis(page, 'seletor-exercicio')).toContainText(`Supino Evo ${SUFIXO_EVO}`);
    await esperarAtual(page, 'comparacao-treino', regexValor('52,5', 'kg'), hojeBr());
    await expect(page.getByTestId('grafico-treino-valor')).toHaveCount(0); // sem repetir o valor no gráfico
    await expect(page.getByTestId('grafico-treino').locator('polyline')).toHaveCount(1);
    await expect(page.locator('[data-testid^="grafico-treino-ponto-"]')).toHaveCount(5);
    // progresso: 40 → 52,5 = +12,5 kg (12,5 / 40 = 31,25% → +31,3%)
    await expect(vis(page, 'progresso-periodo')).toHaveText(/No período\s*↑\s*\+12,5 kg \(\+31,3%\)/);
    // comparação (último × anterior): 52,5 × 55 → −2,5 kg (−2,5 / 55 = −4,545% → −4,5%)
    await expect(vis(page, 'comparacao-treino-atual')).toHaveText(regexValor('52,5', 'kg'));
    await expect(vis(page, 'comparacao-treino-anterior')).toContainText(contemValor('55', 'kg'));
    await expect(vis(page, 'comparacao-treino-variacao')).toHaveText('−2,5 kg (−4,5%)');

    // tocar num ponto: o segundo (−20 dias) mostra 50 kg naquela data
    await vis(page, 'grafico-treino-ponto-1').click();
    await esperarSelecao(page, 'grafico-treino', regexValor('50', 'kg'), hojeBr(-20));

    // histórico de desempenho: só os 3 registros mais recentes (hoje, −3, −10), mais recente primeiro, e o link
    // para o histórico completo sempre visível. O dia com 2 registros somados (−20: 5 séries, até 12 reps,
    // 2280 kg) fica fora da tela e é coberto pelo passo de API.
    const linhas = page.locator('[data-testid^="historico-ponto-"]');
    await expect(linhas).toHaveCount(3);
    await expect(linhas.first()).toHaveAttribute('data-testid', `historico-ponto-${hojeIso()}`);
    await expect(linhas.nth(2)).toHaveAttribute('data-testid', `historico-ponto-${hojeIso(-10)}`);
    await expect(vis(page, `historico-ponto-${hojeIso(-10)}`)).toHaveText(
      new RegExp(`${hojeBr(-10)}\\s*4 séries\\s*·\\s*até 6 reps\\s*55\\s*kg\\s*vol\\.\\s*1320\\s*kg`),
    );
    await expect(page.getByTestId(`historico-ponto-${hojeIso(-20)}`)).toHaveCount(0);
    await expect(vis(page, 'link-detalhe-exercicio')).toBeVisible();

    // métrica Repetições: 12 × 10 → +2 reps (+20%); progresso 10 → 12
    await vis(page, 'segmento-repeticoes_maximas').click();
    await esperarAtual(page, 'comparacao-treino', regexValor('12', 'reps'), hojeBr());
    await expect(vis(page, 'comparacao-treino-variacao')).toHaveText('+2 reps (+20%)');
    await expect(vis(page, 'progresso-periodo')).toHaveText(/\+2 reps \(\+20%\)/);
    // métrica Volume: 1890 × 1650 → +240 kg totais (240 / 1650 = 14,545% → +14,5%); progresso 1200 → 1890 = +690 (+57,5%)
    await vis(page, 'segmento-volume').click();
    await esperarAtual(page, 'comparacao-treino', regexValor('1890', 'kg totais'), hojeBr());
    await expect(vis(page, 'comparacao-treino-variacao')).toHaveText('+240 kg totais (+14,5%)');
    await expect(vis(page, 'progresso-periodo')).toHaveText(/\+690 kg totais \(\+57,5%\)/);
    await vis(page, 'segmento-carga_maxima').click();

    // períodos: pontos do gráfico e progresso do período; a comparação não muda
    const pontosNoGrafico = (n: number) =>
      expect(page.locator('[data-testid^="grafico-treino-ponto-"]')).toHaveCount(n);
    await vis(page, 'periodo-7d').click(); // −3 (55) e hoje (52,5)
    await pontosNoGrafico(2);
    await expect(vis(page, 'progresso-periodo')).toHaveText(/−2,5 kg \(−4,5%\)/);
    await vis(page, 'periodo-30d').click(); // −20 (50), −10, −3, hoje: +2,5 kg (+5%)
    await pontosNoGrafico(4);
    await expect(vis(page, 'progresso-periodo')).toHaveText(/\+2,5 kg \(\+5%\)/);
    await vis(page, 'periodo-3m').click();
    await pontosNoGrafico(5);
    await vis(page, 'periodo-tudo').click();
    await pontosNoGrafico(5);
    await expect(vis(page, 'comparacao-treino-variacao')).toHaveText('−2,5 kg (−4,5%)');
  });

  await test.step('UI: valores iguais, ponto único, período vazio e atalho para o detalhe', async () => {
    // Remada: dois dias com 30 kg → variação zero
    await vis(page, 'seletor-exercicio').click();
    await vis(page, `seletor-exercicio-opcao-${idsEvo.remada}`).click();
    await expect(vis(page, 'seletor-exercicio')).toContainText(`Remada Evo ${SUFIXO_EVO}`);
    await esperarAtual(page, 'comparacao-treino', regexValor('30', 'kg'), hojeBr(-6));
    await expect(vis(page, 'comparacao-treino-variacao')).toHaveText('0 kg (0%)');
    await expect(vis(page, 'progresso-periodo')).toHaveText(/0 kg \(0%\)/);
    // "7 dias": só o dia −6 → um ponto, sem linha; a comparação continua com os dois dias
    await vis(page, 'periodo-7d').click();
    await expect(page.locator('[data-testid^="grafico-treino-ponto-"]')).toHaveCount(1);
    await expect(page.getByTestId('grafico-treino').locator('polyline')).toHaveCount(0);
    await expect(page.getByTestId('progresso-periodo')).toHaveCount(0);
    await expect(vis(page, 'comparacao-treino-anterior')).toBeVisible();

    // Rosca: um registro só, há 100 dias
    await vis(page, 'seletor-exercicio').click();
    await vis(page, `seletor-exercicio-opcao-${idsEvo.rosca}`).click();
    await expect(vis(page, 'desempenho-vazio')).toContainText('Sem registros neste período');
    await expect(vis(page, 'comparacao-treino-sem-anterior')).toHaveText('Primeiro registro');
    await expect(vis(page, 'comparacao-treino-atual')).toHaveText(regexValor('20', 'kg'));
    await vis(page, 'periodo-6m').click();
    await esperarAtual(page, 'comparacao-treino', regexValor('20', 'kg'), hojeBr(-100));
    await expect(page.getByTestId('grafico-treino').locator('polyline')).toHaveCount(0);
    await vis(page, 'periodo-3m').click();
    await expect(vis(page, 'desempenho-vazio')).toBeVisible();
    await vis(page, 'link-detalhe-exercicio').click();
    await expect(page).toHaveURL(new RegExp(`/aluno/evolucao/${idsEvo.rosca}$`));
    await clicarVoltar(page);
    await expect(vis(page, 'tela-evolucao')).toBeVisible();
  });

  await test.step('UI: evolução física, valores nulos, comparação e histórico das avaliações', async () => {
    await abrirLado(page, 'corpo');
    await expect(vis(page, 'secao-fisica')).toBeVisible();
    await expect(page.getByTestId('secao-treinos')).toHaveCount(0);
    const pontosFisicos = () => page.locator('[data-testid^="grafico-fisico-ponto-"]');

    // Peso (80, 78, 76,5): 76,5 × 78 → −1,5 kg (−1,5 / 78 = −1,92% → −1,9%)
    await expect(pontosFisicos()).toHaveCount(3);
    await esperarAtual(page, 'comparacao-fisica', regexValor('76,5', 'kg'), hojeBr(-5));
    await expect(vis(page, 'comparacao-fisica-anterior')).toContainText(contemValor('78', 'kg'));
    await expect(vis(page, 'comparacao-fisica-atual')).toHaveText(regexValor('76,5', 'kg'));
    await expect(vis(page, 'comparacao-fisica-variacao')).toHaveText('−1,5 kg (−1,9%)');
    await vis(page, 'grafico-fisico-ponto-0').click();
    await esperarSelecao(page, 'grafico-fisico', regexValor('80', 'kg'), hojeBr(-60));

    // Gordura: a avaliação de −30 dias não tem o indicador (null) → 2 pontos; compara 22 × 25 → −3 % (−12%)
    await vis(page, 'segmento-percentual_gordura').click();
    await expect(pontosFisicos()).toHaveCount(2);
    await expect(vis(page, 'comparacao-fisica-anterior')).toContainText(contemValor('25', '%'));
    await expect(vis(page, 'comparacao-fisica-atual')).toHaveText(regexValor('22', '%'));
    await expect(vis(page, 'comparacao-fisica-variacao')).toHaveText('−3 % (−12%)');

    // Massa muscular: a de −5 dias é null → 2 pontos (40 em −60, 41 em −30): +1 kg (+2,5%)
    await vis(page, 'segmento-massa_muscular').click();
    await expect(pontosFisicos()).toHaveCount(2);
    await esperarAtual(page, 'comparacao-fisica', regexValor('41', 'kg'), hojeBr(-30));
    await expect(vis(page, 'comparacao-fisica-variacao')).toHaveText('+1 kg (+2,5%)');

    // IMC (sem unidade): 24,69 → 24,07 → 23,61; 23,61 × 24,07 = −0,46 (−0,46 / 24,07 = −1,91% → −1,9%)
    await vis(page, 'segmento-imc').click();
    await expect(pontosFisicos()).toHaveCount(3);
    await expect(vis(page, 'comparacao-fisica-atual')).toHaveText('23,61');
    await expect(vis(page, 'comparacao-fisica-anterior')).toContainText('24,07');
    await expect(vis(page, 'comparacao-fisica-variacao')).toHaveText('−0,46 (−1,9%)');

    // Histórico das avaliações: lista compacta, mais recente primeiro; tocar na linha abre o detalhe
    const [a1, a2, a3] = idsEvo.avaliacoes; // −60, −30, −5
    const linhasAvaliacao = page.locator(
      '[data-testid^="avaliacao-"]:not([data-testid$="-linha"]):not([data-testid$="-detalhe"])',
    );
    await expect(linhasAvaliacao).toHaveCount(3);
    await expect(linhasAvaliacao.nth(0)).toHaveAttribute('data-testid', `avaliacao-${a3}`);
    await expect(linhasAvaliacao.nth(1)).toHaveAttribute('data-testid', `avaliacao-${a2}`);
    await expect(linhasAvaliacao.nth(2)).toHaveAttribute('data-testid', `avaliacao-${a1}`);
    await expect(vis(page, `avaliacao-${a3}`)).toContainText(hojeBr(-5));
    await expect(vis(page, `avaliacao-${a3}`)).toContainText('Mais recente');
    await expect(vis(page, `avaliacao-${a3}`)).toContainText(/76,5\s*kg/);
    await expect(vis(page, `avaliacao-${a3}`)).toContainText('23,61');
    await expect(vis(page, `avaliacao-${a3}`)).toContainText(/22\s*%/);
    // recolhidas: sem altura nem observação na lista
    await expect(page.getByTestId(`avaliacao-${a3}-detalhe`)).toHaveCount(0);
    await expect(vis(page, `avaliacao-${a2}`)).toContainText(/78\s*kg/);
    await expect(vis(page, `avaliacao-${a2}`)).toContainText('24,07');
    await expect(vis(page, `avaliacao-${a2}`)).toContainText('—'); // gordura ausente
    await expect(vis(page, `avaliacao-${a2}`)).not.toContainText('Mais recente');

    // detalhe da mais recente: altura, sem massa muscular ("—"), sem observação
    await vis(page, `avaliacao-${a3}-linha`).click();
    await expect(vis(page, `avaliacao-${a3}-detalhe`)).toContainText(/Altura\s*1,80 m/);
    await expect(vis(page, `avaliacao-${a3}-detalhe`)).toContainText(/Massa muscular\s*—/);
    // detalhe da de −30 dias (abre uma por vez): altura e massa muscular
    await vis(page, `avaliacao-${a2}-linha`).click();
    await expect(page.getByTestId(`avaliacao-${a3}-detalhe`)).toHaveCount(0);
    await expect(vis(page, `avaliacao-${a2}-detalhe`)).toContainText(/Altura\s*1,80 m/);
    await expect(vis(page, `avaliacao-${a2}-detalhe`)).toContainText(/Massa muscular\s*41\s*kg/);
    // detalhe da inicial: massa muscular e observação
    await vis(page, `avaliacao-${a1}-linha`).click();
    await expect(vis(page, `avaliacao-${a1}`)).toContainText('24,69');
    await expect(vis(page, `avaliacao-${a1}-detalhe`)).toContainText(/Massa muscular\s*40\s*kg/);
    await expect(vis(page, `avaliacao-${a1}-detalhe`)).toContainText('Inicial E2E');
  });

  await test.step('UI: alternar Treinos/Corpo preserva exercício, métrica, indicador e avaliação expandida (EV-05)', async () => {
    // Estado atual: Corpo com IMC selecionado e a avaliação inicial expandida; Treinos com Rosca.
    const [a1] = idsEvo.avaliacoes;
    await abrirLado(page, 'treinos');
    await vis(page, 'segmento-volume').click();
    await expect(vis(page, 'segmento-volume')).toHaveAttribute('aria-selected', 'true');
    await abrirLado(page, 'corpo');
    await expect(vis(page, 'segmento-imc')).toHaveAttribute('aria-selected', 'true');
    await expect(vis(page, `avaliacao-${a1}-detalhe`)).toContainText('Inicial E2E');
    await abrirLado(page, 'treinos');
    await expect(vis(page, 'seletor-exercicio')).toContainText(`Rosca Evo ${SUFIXO_EVO}`);
    await expect(vis(page, 'segmento-volume')).toHaveAttribute('aria-selected', 'true');
    await vis(page, 'segmento-carga_maxima').click();
    await expect(vis(page, 'segmento-carga_maxima')).toHaveAttribute('aria-selected', 'true');
  });

  await test.step('UI: troca rápida de filtro não deixa o gráfico com dados do filtro antigo', async () => {
    await abrirLado(page, 'treinos');
    await vis(page, 'seletor-exercicio').click();
    await vis(page, `seletor-exercicio-opcao-${idsEvo.supino}`).click();
    await vis(page, 'periodo-tudo').click();
    const origemApi = new URL(process.env.E2E_API_URL!).origin;
    // a resposta de "7d" demora 2,5 s: chega depois das demais e não pode vencer
    await page.route(
      (url) => url.origin === origemApi && url.pathname === `/evolucao/exercicios/${idsEvo.supino}`,
      async (route) => {
        if (new URL(route.request().url()).searchParams.get('periodo') === '7d') {
          await new Promise((r) => setTimeout(r, 2500));
        }
        await route.continue();
      },
    );
    await vis(page, 'periodo-7d').click();
    await vis(page, 'periodo-30d').click();
    await vis(page, 'periodo-3m').click();
    await vis(page, 'periodo-tudo').click();
    await expect(page.locator('[data-testid^="grafico-treino-ponto-"]')).toHaveCount(5);
    await page.waitForTimeout(3500); // dá tempo da resposta atrasada de "7d" chegar
    await expect(page.locator('[data-testid^="grafico-treino-ponto-"]')).toHaveCount(5);
    await expect(vis(page, 'progresso-periodo')).toHaveText(/\+12,5 kg \(\+31,3%\)/);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  await test.step('UI: erro de rede em uma seção não derruba as outras; "Tentar novamente" recupera', async () => {
    const origemApi = new URL(process.env.E2E_API_URL!).origin;
    const falhar = (caminho: (p: string) => boolean) =>
      page.route(
        (url) => url.origin === origemApi && caminho(url.pathname),
        (route) => route.abort('failed'),
      );

    // 1) avaliações fora do ar: o lado Corpo mostra o erro; os treinos (lado padrão) seguem funcionando
    await falhar((p) => p === '/avaliacoes');
    await page.reload();
    await expect(vis(page, 'tela-evolucao')).toBeVisible();
    await expect(vis(page, 'grafico-treino')).toBeVisible();
    await expect(vis(page, 'resumo-evolucao')).not.toContainText('Peso atual');
    await abrirLado(page, 'corpo');
    await expect(vis(page, 'erro-fisica')).toBeVisible();
    await expect(page.getByTestId('secao-avaliacoes')).toHaveCount(0);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await vis(page, 'erro-fisica').getByText('Tentar novamente', { exact: true }).click();
    await expect(vis(page, 'grafico-fisico')).toBeVisible();
    await expect(page.getByTestId('erro-fisica')).toHaveCount(0);
    await expect(vis(page, 'secao-avaliacoes')).toBeVisible();

    // 2) detalhe do exercício fora do ar: erro só no desempenho; o Corpo fica intacto
    await falhar((p) => /^\/evolucao\/exercicios\/\d+$/.test(p));
    await page.reload();
    await expect(vis(page, 'erro-desempenho')).toBeVisible();
    await expect(vis(page, 'seletor-exercicio')).toBeVisible();
    await abrirLado(page, 'corpo');
    await expect(page.getByTestId('erro-fisica')).toHaveCount(0);
    await expect(vis(page, 'grafico-fisico')).toBeVisible();
    await expect(vis(page, 'secao-avaliacoes')).toBeVisible();
    await abrirLado(page, 'treinos');
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await vis(page, 'erro-desempenho').getByText('Tentar novamente', { exact: true }).click();
    await expect(vis(page, 'grafico-treino')).toBeVisible();

    // 3) lista de exercícios fora do ar: erro só no lado Treinos
    await falhar((p) => p === '/evolucao/exercicios');
    await page.reload();
    await expect(vis(page, 'erro-treinos')).toBeVisible();
    await abrirLado(page, 'corpo');
    await expect(vis(page, 'grafico-fisico')).toBeVisible();
    await abrirLado(page, 'treinos');
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await vis(page, 'erro-treinos').getByText('Tentar novamente', { exact: true }).click();
    await expect(vis(page, 'grafico-treino')).toBeVisible();
  });

  await test.step('UI: aluno sem dados vê os estados vazios', async () => {
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await login(page, alunoVazio.email, SENHA_ALUNO);
    await expect(page).toHaveURL(/\/aluno$/);
    await abrirEvolucao(page);
    await expect(vis(page, 'secao-treinos')).toContainText('Sem evolução ainda');
    await expect(vis(page, 'secao-treinos')).toContainText('Registre treinos para acompanhar sua evolução.');
    await abrirLado(page, 'corpo');
    await expect(vis(page, 'secao-fisica')).toContainText('Nenhuma avaliação');
    await expect(vis(page, 'secao-fisica')).toContainText('Você ainda não tem avaliações físicas.');
    await expect(page.getByTestId('resumo-evolucao')).toHaveCount(0);
    await expect(page.getByTestId('secao-avaliacoes')).toHaveCount(0);
    await expect(page.getByTestId('grafico-treino')).toHaveCount(0);
    // nenhum dado do outro aluno vaza para a tela
    await expect(page.getByText(`Supino Evo ${SUFIXO_EVO}`)).toHaveCount(0);
    await expect(page.getByText('76,5')).toHaveCount(0);
  });

  // QA-EV04-01: duas avaliações no mesmo dia (mesmo instante). A API entrega `data desc, id desc`;
  // "atual" e "anterior" valem por (data, id) crescente: a de maior id é a mais recente.
  await test.step('UI: duas avaliações no mesmo dia — atual/anterior por (data, id), resumo, comparação e selo coerentes', async () => {
    const alunoMesmoDia = { nome: `Aluno Mesmo Dia ${SUFIXO_EVO}`, email: `aluno.mesmodia.${SUFIXO_EVO}@example.com` };
    const cadastro = await chamarApi(request, 'POST', '/cadastro', {
      dados: {
        nome: alunoMesmoDia.nome,
        email: alunoMesmoDia.email,
        senha: SENHA_ALUNO,
        telefone: '11955556666',
        data_nascimento: '1990-01-01',
      },
    });
    expect(cadastro.status).toBe(200);
    const alunos = (await chamarApi(request, 'GET', '/alunos', { token: prof })).corpo as { id: number; nome: string }[];
    const idMesmoDia = alunos.find((a) => a.nome === alunoMesmoDia.nome)!.id;

    // Mesmo instante nas duas (só o id desempata). Altura 1,70 → altura² = 2,89:
    // IMC 70,5 / 2,89 = 24,39 | 71 / 2,89 = 24,57 → +0,18; 0,18 / 24,39 = 0,74% → +0,7%
    // Peso: 71 × 70,5 → +0,5 kg (0,5 / 70,5 = 0,709% → +0,7%)
    // Gordura: 19 × 20 → −1 % (−5%) | Massa muscular: 36 × 35 → +1 kg (1 / 35 = 2,857% → +2,9%)
    const instante = `${hojeIso(-2)}T09:00:00`;
    const ids: number[] = [];
    for (const [peso, gordura, massa] of [
      [70.5, 20, 35],
      [71, 19, 36],
    ]) {
      const r = await chamarApi(request, 'POST', `/alunos/${idMesmoDia}/avaliacoes`, {
        token: prof,
        dados: {
          data_avaliacao: instante,
          peso,
          altura: 1.7,
          percentual_gordura: gordura,
          massa_muscular: massa,
          observacao: null,
        },
      });
      expect(r.status).toBe(200);
      ids.push(r.corpo.id);
    }
    const [idAntigo, idRecente] = ids;
    expect(idRecente).toBeGreaterThan(idAntigo);

    // a API entrega a lista invertida em relação à ordem cronológica: é esse o cenário do defeito
    const tokenMesmoDia = await loginApi(request, alunoMesmoDia.email, SENHA_ALUNO);
    const lista = await chamarApi(request, 'GET', '/avaliacoes', { token: tokenMesmoDia });
    expect(lista.corpo.map((a: { id: number }) => a.id)).toEqual([idRecente, idAntigo]);

    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await login(page, alunoMesmoDia.email, SENHA_ALUNO);
    await expect(page).toHaveURL(/\/aluno$/);
    await abrirEvolucao(page);

    const pontosFisicos = page.locator('[data-testid^="grafico-fisico-ponto-"]');
    // Resumo: peso atual = 71 kg (a avaliação de maior id)
    await expect(vis(page, 'resumo-evolucao')).toHaveText(/71\s*kg\s*Peso atual/);
    await abrirLado(page, 'corpo');

    // Peso: dois pontos no mesmo dia; atual 71, anterior 70,5, +0,5 kg (+0,7%)
    await expect(pontosFisicos).toHaveCount(2);
    await esperarAtual(page, 'comparacao-fisica', regexValor('71', 'kg'), hojeBr(-2));
    await expect(vis(page, 'comparacao-fisica-atual')).toHaveText(regexValor('71', 'kg'));
    await expect(vis(page, 'comparacao-fisica-anterior')).toContainText(contemValor('70,5', 'kg'));
    await expect(vis(page, 'comparacao-fisica-variacao')).toHaveText('+0,5 kg (+0,7%)');

    // IMC (sem unidade): 24,57 × 24,39 → +0,18 (+0,7%)
    await vis(page, 'segmento-imc').click();
    await expect(pontosFisicos).toHaveCount(2);
    await expect(vis(page, 'comparacao-fisica-atual')).toHaveText('24,57');
    await expect(vis(page, 'comparacao-fisica-anterior')).toContainText('24,39');
    await expect(vis(page, 'comparacao-fisica-variacao')).toHaveText('+0,18 (+0,7%)');

    // Gordura e massa muscular seguem a mesma ordem
    await vis(page, 'segmento-percentual_gordura').click();
    await expect(vis(page, 'comparacao-fisica-atual')).toHaveText(regexValor('19', '%'));
    await expect(vis(page, 'comparacao-fisica-anterior')).toContainText(contemValor('20', '%'));
    await expect(vis(page, 'comparacao-fisica-variacao')).toHaveText('−1 % (−5%)');
    await vis(page, 'segmento-massa_muscular').click();
    await expect(vis(page, 'comparacao-fisica-atual')).toHaveText(regexValor('36', 'kg'));
    await expect(vis(page, 'comparacao-fisica-anterior')).toContainText(contemValor('35', 'kg'));
    await expect(vis(page, 'comparacao-fisica-variacao')).toHaveText('+1 kg (+2,9%)');

    // Histórico: o selo "Mais recente" fica na avaliação de 71 kg, que vem primeiro
    const cartoes = page.locator(
      '[data-testid^="avaliacao-"]:not([data-testid$="-linha"]):not([data-testid$="-detalhe"])',
    );
    await expect(cartoes).toHaveCount(2);
    await expect(cartoes.nth(0)).toHaveAttribute('data-testid', `avaliacao-${idRecente}`);
    await expect(cartoes.nth(1)).toHaveAttribute('data-testid', `avaliacao-${idAntigo}`);
    await expect(vis(page, `avaliacao-${idRecente}`)).toContainText('Mais recente');
    await expect(vis(page, `avaliacao-${idRecente}`)).toContainText(/71\s*kg/);
    await expect(vis(page, `avaliacao-${idRecente}`)).toContainText('24,57');
    await expect(vis(page, `avaliacao-${idAntigo}`)).not.toContainText('Mais recente');
    await expect(vis(page, `avaliacao-${idAntigo}`)).toContainText(/70,5\s*kg/);
    await expect(vis(page, `avaliacao-${idAntigo}`)).toContainText('24,39');
  });

  semDialogosPendentes();
});
