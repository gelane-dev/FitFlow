// Prepara o ambiente do E2E (ADR-026): API em SQLite temporário + build web estático.
// Uso: const ambiente = await preparar(); ... ; await ambiente.encerrar();
// Também roda sozinho para depuração: `node scripts/preparar.js` (Ctrl+C encerra).
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..', '..');
const BACKEND = path.join(RAIZ, 'backend');
const FRONTEND = path.join(RAIZ, 'frontend');
const PYTHON = path.join(
  BACKEND,
  'venv',
  process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
);

const SECRET_KEY = 'e2e-chave-de-teste-nao-usar-em-producao';
const ADMIN = { email: 'admin.e2e@example.com', senha: 'Admin@12345' };
const PROFESSOR = {
  email: 'professor.e2e@example.com',
  senha: 'Prof@12345',
  nome: 'Professor E2E',
  telefone: '11911110000',
};

const processos = [];

function log(msg) {
  console.log(`[e2e] ${msg}`);
}

function portaLivre() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function executar(cmd, args, opcoes) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: false, ...opcoes });
  if (r.status !== 0) {
    throw new Error(
      `Falhou: ${cmd} ${args.join(' ')}\n${r.stdout ?? ''}\n${r.stderr ?? ''}${r.error ? `\n${r.error}` : ''}`,
    );
  }
  return r.stdout;
}

function subir(cmd, args, opcoes, arquivoLog) {
  const saida = fs.openSync(arquivoLog, 'a');
  const filho = spawn(cmd, args, {
    stdio: ['ignore', saida, saida],
    windowsHide: true,
    ...opcoes,
  });
  processos.push(filho);
  return filho;
}

function matar(filho) {
  if (!filho.pid || filho.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(filho.pid), '/T', '/F']);
  } else {
    filho.kill('SIGTERM');
  }
}

async function esperarUrl(url, rotulo, timeoutMs = 60000) {
  const limite = Date.now() + timeoutMs;
  let ultimoErro = '';
  while (Date.now() < limite) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return;
      ultimoErro = `HTTP ${r.status}`;
    } catch (e) {
      ultimoErro = String(e.cause?.code ?? e.message);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`${rotulo} não respondeu em ${timeoutMs} ms (${url}): ${ultimoErro}`);
}

async function preparar() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fitflow-e2e-'));
  const caminhoDb = path.join(tmp, 'e2e.db');
  const dirWeb = process.env.E2E_WEB_DIR || path.join(tmp, 'web');
  const portaApi = Number(process.env.E2E_API_PORT) || (await portaLivre());
  const portaWeb = Number(process.env.E2E_WEB_PORT) || (await portaLivre());
  const apiUrl = `http://localhost:${portaApi}`;
  const webUrl = `http://localhost:${portaWeb}`;

  // Variáveis já definidas no processo prevalecem sobre um backend/.env (python-dotenv
  // não sobrescreve), então o E2E nunca toca o banco de desenvolvimento.
  const envApi = {
    ...process.env,
    DATABASE_URL: `sqlite:///${caminhoDb.replace(/\\/g, '/')}`,
    SECRET_KEY,
    CORS_ORIGINS: '*',
    PYTHONUTF8: '1',
  };

  const ambiente = { tmp, apiUrl, webUrl, caminhoDb, admin: ADMIN, professor: PROFESSOR };
  ambiente.encerrar = async () => {
    processos.forEach(matar);
    processos.length = 0;
    if (!process.env.E2E_MANTER_TMP) {
      // espera curta: no Windows os arquivos podem ficar presos por instantes
      await new Promise((r) => setTimeout(r, 500));
      fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
    }
  };

  try {
    log(`tmp: ${tmp}`);

    log('criando schema (alembic upgrade head, com fallback create_all)');
    log(
      executar(PYTHON, [path.join(__dirname, 'criar_schema.py'), caminhoDb], {
        cwd: BACKEND,
        env: envApi,
      }).trim(),
    );

    log(`criando admin ${ADMIN.email}`);
    executar(
      PYTHON,
      ['-m', 'app.scripts.criar_admin', '--email', ADMIN.email, '--senha', ADMIN.senha],
      { cwd: BACKEND, env: envApi },
    );

    log(`subindo API em ${apiUrl}`);
    subir(
      PYTHON,
      ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(portaApi)],
      { cwd: BACKEND, env: envApi },
      path.join(tmp, 'api.log'),
    );
    await esperarUrl(`${apiUrl}/docs`, 'API');

    log(`criando professor ${PROFESSOR.email}`);
    const rl = await fetch(`${apiUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ADMIN),
    });
    if (!rl.ok) throw new Error(`login do admin falhou: ${rl.status} ${await rl.text()}`);
    const { access_token } = await rl.json();
    const rp = await fetch(`${apiUrl}/admin/professores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
      body: JSON.stringify(PROFESSOR),
    });
    if (!rp.ok) throw new Error(`criar professor falhou: ${rp.status} ${await rp.text()}`);

    if (process.env.E2E_WEB_DIR) {
      log(`reutilizando build web de ${dirWeb} (E2E_WEB_DIR)`);
    } else {
      log('gerando build web (expo export) — pode levar alguns minutos');
      const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      executar(npx, ['expo', 'export', '--platform', 'web', '--clear', '--output-dir', dirWeb], {
        cwd: FRONTEND,
        env: { ...process.env, EXPO_PUBLIC_API_URL: apiUrl, CI: '1' },
        shell: process.platform === 'win32',
        maxBuffer: 64 * 1024 * 1024,
      });
    }

    log(`servindo build web em ${webUrl}`);
    subir(
      process.execPath,
      [
        path.join(__dirname, '..', 'node_modules', 'serve', 'build', 'main.js'),
        '-s',
        dirWeb,
        '-l',
        String(portaWeb),
        '--no-clipboard',
      ],
      { cwd: tmp },
      path.join(tmp, 'web.log'),
    );
    await esperarUrl(webUrl, 'servidor web');
  } catch (erro) {
    await ambiente.encerrar();
    throw erro;
  }

  return ambiente;
}

module.exports = { preparar, ADMIN, PROFESSOR };

if (require.main === module) {
  preparar().then(
    (a) => {
      log(`pronto: web=${a.webUrl} api=${a.apiUrl} (Ctrl+C encerra)`);
      process.on('SIGINT', async () => {
        await a.encerrar();
        process.exit(0);
      });
    },
    (e) => {
      console.error(e);
      process.exit(1);
    },
  );
}
