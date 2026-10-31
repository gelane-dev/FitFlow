import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

// Relatório e artefatos ficam fora do repositório.
const SAIDA = process.env.E2E_SAIDA || path.join(os.tmpdir(), 'fitflow-e2e-resultados');

export default defineConfig({
  testDir: './tests',
  // Os cenários formam uma sequência (E2E-01 cria o aluno, E2E-02 monta a ficha...).
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  globalSetup: './global-setup.ts',
  outputDir: path.join(SAIDA, 'artefatos'),
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(SAIDA, 'relatorio-html'), open: 'never' }],
  ],
  use: {
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 480, height: 900 } },
    },
  ],
});
