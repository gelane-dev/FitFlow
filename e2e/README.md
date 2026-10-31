# E2E do FitFlow (Playwright)

Testes de ponta a ponta no navegador (ADR-026): API real em SQLite temporário + build web do app
(`expo export --platform web`) servido localmente. Os cenários cobrem (E2E-01 a E2E-09) cadastro, login, fluxo do
professor (exercício → ficha → treino → itens), execução do treino pelo aluno, histórico, avaliação
física, guarda de rotas, sessão e perfil.

## Pré-requisitos

- Node 20+ e `npm install` feito em `frontend/` (o build web usa `frontend/node_modules`).
- Venv do backend criado em `backend/venv` com `pip install -r requirements.txt` (usa
  `backend/venv/Scripts/python`; no Linux/macOS, `backend/venv/bin/python`).
- Chromium do Playwright: `npx playwright install chromium`.

## Rodando

```bash
cd e2e
npm install
npx playwright install chromium   # só na primeira vez
npm test
```

O `globalSetup` (`scripts/preparar.js`) cria o banco temporário fora do repositório, sobe a API,
cria o admin e um professor, gera o build web (leva alguns minutos, com `--clear` para o
`EXPO_PUBLIC_API_URL` não vir de cache do Metro) e serve o resultado; o teardown encerra tudo e
apaga o diretório temporário. Portas livres são escolhidas automaticamente.

Relatório HTML e artefatos (screenshots/traces de falha): `%TEMP%/fitflow-e2e-resultados/`
(`relatorio-html/index.html`). Para abrir: `npx playwright show-report <caminho>/relatorio-html`.

## Variáveis opcionais

| Variável | Efeito |
|---|---|
| `E2E_SAIDA` | pasta do relatório/artefatos |
| `E2E_API_PORT`, `E2E_WEB_PORT` | portas fixas (necessário ao usar `E2E_WEB_DIR`) |
| `E2E_WEB_DIR` | reaproveita um build web já gerado com `EXPO_PUBLIC_API_URL=http://localhost:<E2E_API_PORT>` |
| `E2E_MANTER_TMP` | não apaga o diretório temporário (logs `api.log`/`web.log`, banco) |

## Observações

- Alembic: `alembic upgrade head` não roda em SQLite (a migração `e4444f75bdc7` usa
  `ALTER ... ADD CONSTRAINT`), então `scripts/criar_schema.py` tenta o alembic e, ao falhar, usa
  `Base.metadata.create_all`.
- Na web o app usa `window.alert/confirm` (ADR-030): os testes aceitam todo diálogo via `page.on('dialog')` e conferem as mensagens esperadas.
- Os cenários são sequenciais (`workers: 1`, modo serial): o E2E-01 cria o aluno usado pelos demais.
- Fora do CI por enquanto (ADR-027).
