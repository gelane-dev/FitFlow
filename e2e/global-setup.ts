// eslint-disable-next-line @typescript-eslint/no-require-imports
const { preparar } = require('./scripts/preparar.js');

export default async function globalSetup() {
  const ambiente = await preparar();

  // Variáveis definidas aqui são herdadas pelos workers do Playwright.
  process.env.E2E_WEB_URL = ambiente.webUrl;
  process.env.E2E_API_URL = ambiente.apiUrl;
  process.env.E2E_PROFESSOR_EMAIL = ambiente.professor.email;
  process.env.E2E_PROFESSOR_SENHA = ambiente.professor.senha;
  process.env.E2E_ADMIN_EMAIL = ambiente.admin.email;
  process.env.E2E_ADMIN_SENHA = ambiente.admin.senha;
  process.env.E2E_RECEPCAO_EMAIL = ambiente.recepcao.email;
  process.env.E2E_RECEPCAO_SENHA = ambiente.recepcao.senha;
  process.env.E2E_PLANO_NOME = ambiente.plano.nome;

  // O retorno do globalSetup é o teardown: encerra API e servidor web e apaga o tmp.
  return async () => {
    await ambiente.encerrar();
  };
}
