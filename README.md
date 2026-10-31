# FitFlow

Aplicativo mobile para gerenciamento de treinos de academia, com uma API REST para organizar usuários, exercícios, fichas e sessões de treino.

O projeto conecta um backend em **Python/FastAPI** a um aplicativo desenvolvido com **React Native e Expo**. O foco é construir fluxos reais de gerenciamento de treinos, com autenticação, permissões por perfil e persistência em banco de dados relacional.

**Status:** em desenvolvimento ativo. Os fluxos de professor e de aluno estão implementados e testados por máquina (pytest, jest e E2E no navegador); a validação em dispositivo físico e a primeira execução do CI no GitHub ainda estão pendentes.

## Visão geral

O FitFlow está sendo desenvolvido como uma aplicação para apoiar a rotina de professores e alunos de academia. O backend fornece as operações de negócio e o aplicativo mobile consome a API para apresentar e gerenciar os dados.

### O que já está implementado

#### Backend e API
- Cadastro de alunos e autenticação por e-mail e senha.
- Emissão e validação de tokens JWT.
- Hash e verificação de senhas.
- Perfis de aluno, professor e administrador, com verificações de acesso nas rotas protegidas.
- Consulta e atualização de informações de perfil.
- Criação de professores por rota administrativa protegida.
- Cadastro, consulta, edição e remoção de exercícios.
- Listagem de exercícios com paginação, busca por nome e filtro por grupo muscular.
- Upload e gerenciamento de imagens e vídeos de exercícios com Cloudinary.
- Criação e gerenciamento de fichas de treino vinculadas a alunos e professores.
- Organização de treinos por ficha, dia da semana e ordem.
- Inclusão e gerenciamento dos exercícios de cada treino, com séries, repetições, carga e descanso.
- Registro de execução de exercícios pelo aluno, incluindo carga utilizada, séries, repetições, data e observações.
- Consulta ao histórico de execução do aluno.
- Vigência de fichas (`data_inicio`/`data_fim`), edição de ficha, treino e item e reordenação atômica dos itens.
- Sessões de treino: execução série a série, finalização com esforço percebido (1–10) e comentário.
- Evolução de carga e volume por exercício, visível ao aluno e a qualquer professor.
- Avaliação física (peso, altura, IMC, gordura, massa muscular) criada e editada pelo professor autor.
- Visão do professor sobre os alunos (fichas, sessões, evolução, avaliações).
- Foto de perfil no Cloudinary, CORS e fuso horário configuráveis, comando para criar o admin inicial.
- Migrações do banco de dados com Alembic (16 revisões).

#### Aplicativo mobile
- Fluxo de login com tratamento de erros e estado de carregamento.
- Fluxo de cadastro de conta.
- Navegação com Expo Router.
- Contexto e hooks para autenticação e comunicação com a API.
- Biblioteca de exercícios com paginação.
- Visualização de detalhes e edição de exercícios.
- Fluxos para criação de exercícios.
- Listagem, criação, visualização e remoção de fichas de treino.
- Componentes reutilizáveis para botões, campos de entrada e cartões.
- Sessão persistente (Expo SecureStore), navegação separada por perfil (professor, aluno, admin) e retorno ao login quando o token expira.
- Telas do professor: alunos, detalhe do aluno, edição de ficha/treino/item, avaliações e evolução.
- Telas do aluno: home com ficha vigente e treino de hoje, execução do treino com cronômetro de descanso, histórico, evolução (gráficos simples), avaliações e lembrete diário local.
- Perfil: dados, e-mail, senha e foto.

> O projeto continua em evolução. A disponibilidade de cada fluxo depende da integração atual com a API e deve ser validada no ambiente local.

## Tecnologias

| Área | Tecnologias |
|---|---|
| Backend | Python, FastAPI |
| Persistência | PostgreSQL, SQLAlchemy |
| Migrações | Alembic |
| Validação de dados | Pydantic |
| Autenticação | JWT, pwdlib |
| Mídia | Cloudinary |
| Mobile | React Native, Expo, TypeScript |
| Navegação mobile | Expo Router |
| Comunicação HTTP | Axios |
| Armazenamento seguro mobile | Expo SecureStore |
| Notificações | Expo Notifications (lembrete local) |
| Testes | pytest, jest-expo + Testing Library, Playwright (E2E) |
| Qualidade | ESLint, GitHub Actions |
| Ferramentas | Git, GitHub |

As versões das dependências estão declaradas em `backend/requirements.txt` e `frontend/package.json`.

## Organização do repositório

```text
FitFlow/
├── backend/
│   ├── app/
│   │   ├── core/          # Segurança e dependências comuns
│   │   ├── enums/         # Enumerações do domínio
│   │   ├── models/        # Modelos SQLAlchemy
│   │   ├── routers/       # Endpoints da API
│   │   ├── schemas/       # Schemas Pydantic
│   │   ├── services/      # Integrações e regras reutilizadas
│   │   ├── scripts/       # criar_admin, criar_demo
│   │   └── ...            # Banco de dados e configuração
│   ├── alembic/           # Migrações do banco
│   ├── tests/             # Testes (pytest)
│   ├── alembic.ini
│   ├── requirements.txt
│   └── requirements-dev.txt
├── frontend/
│   ├── src/
│   │   ├── app/           # Telas e rotas mobile
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── contexts/      # Contextos da aplicação
│   │   ├── hooks/         # Hooks de domínio e integração
│   │   ├── utils/         # Lógica pura testável
│   │   └── ...            # Serviços, tipos e storage
│   └── package.json
├── e2e/                   # Testes ponta a ponta (Playwright)
├── .github/workflows/     # CI
└── README.md
```

## Como executar localmente

### Pré-requisitos

- Python 3.13.
- PostgreSQL em execução.
- Node.js 20 ou superior e npm (o CI usa Node 24).
- Expo Go ou um emulador Android/iOS para executar o aplicativo.

### 1. Clonar o projeto

```bash
git clone https://github.com/gelane-dev/FitFlow.git
cd FitFlow
```

### 2. Configurar o backend

Entre na pasta do backend e crie/ative um ambiente virtual:

```bash
cd backend
```

**Windows PowerShell:**

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**Linux/macOS:**

```bash
python3 -m venv venv
source venv/bin/activate
```

Instale as dependências (`requirements-dev.txt` traz pytest e httpx, necessários para os testes):

```bash
pip install -r requirements.txt -r requirements-dev.txt
```

Crie o arquivo `backend/.env` a partir do modelo e preencha os valores:

```bash
cp .env.exemplo .env     # PowerShell: Copy-Item .env.exemplo .env
```

`DATABASE_URL` (PostgreSQL) e `SECRET_KEY` são **obrigatórias**: sem elas a API e o Alembic recusam iniciar com uma mensagem clara. As três variáveis `CLOUDINARY_*` são necessárias apenas para enviar imagens e vídeos de exercícios e fotos de perfil (os testes não precisam delas).

> Não envie arquivos `.env`, senhas, tokens ou credenciais para o repositório.

Variáveis opcionais: `SQL_ECHO` (padrão `false`), `JWT_EXPIRA_MINUTOS` (padrão 30), `CORS_ORIGINS` (vazio ou `*` libera tudo sem credenciais; lista separada por vírgula restringe) e `APP_TIMEZONE` (padrão `America/Sao_Paulo`).

### 3. Aplicar as migrações

Crie um banco PostgreSQL vazio (por exemplo `createdb fitflow`) e aponte `DATABASE_URL` para ele. Dentro de `backend/`:

```bash
alembic upgrade head
```

Para criar o admin inicial (dentro de `backend/`, depois das migrações; o admin cria professores pela API, `POST /admin/professores`):

```bash
python -m app.scripts.criar_admin --email admin@exemplo.com
```

Sem `--senha`, a senha é pedida no terminal. O comando recusa e-mails já cadastrados.

#### Dados de demonstração (opcional)

Para ver o app com conteúdo (capturas de tela, demonstrações), rode dentro de `backend/`:

```bash
python -m app.scripts.criar_demo
```

O script usa o `DATABASE_URL` do `.env`, é **idempotente** (pode rodar várias vezes) e **nunca apaga dados**. Cria o professor `prof.demo@fitflow.com` e o aluno `aluno.demo@fitflow.com` (senha dos dois: `Demo@1234`), 8 exercícios, uma ficha vigente com 4 treinos (um deles cai no dia de hoje), 8 sessões finalizadas nas últimas 3 semanas com evolução de carga e 2 avaliações físicas. Não use em produção.

### 4. Iniciar a API

O ponto de entrada atual da aplicação FastAPI está em `backend/app/main.py` (execute dentro de `backend/`):

```bash
uvicorn app.main:app --reload
```

A API estará disponível localmente em `http://localhost:8000`. A documentação interativa fica em:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 5. Iniciar o aplicativo mobile

Em outro terminal:

```bash
cd frontend
npm install
npx expo start
```

Informe a URL da API em `frontend/.env` (o app não tem valor padrão; sem ela, as chamadas falham):

```bash
EXPO_PUBLIC_API_URL=http://localhost:8000
```

Para testar em um celular físico, use o endereço IP local do computador (por exemplo `http://192.168.0.10:8000`) em vez de `localhost`; os dois dispositivos precisam estar na mesma rede e o firewall deve permitir a conexão. Se restringir `CORS_ORIGINS`, inclua a origem usada na web. Reinicie o `expo start` (com `--clear`) depois de mudar o `.env`. Lembretes de treino usam notificações locais e só funcionam no aparelho, não no navegador.

## Testes e CI

Backend (dentro de `backend/`, com o venv ativo):

```bash
pip install -r requirements.txt -r requirements-dev.txt
pytest -q                      # SQLite em memória, sem Postgres nem Cloudinary
```

Para rodar a suíte inteira contra PostgreSQL, suba um banco descartável e defina `TEST_POSTGRES_URL`:

```bash
docker run -d --name fitflow-pg-teste -e POSTGRES_PASSWORD=teste -e POSTGRES_DB=fitflow_teste -p 15432:5432 postgres:16
export TEST_POSTGRES_URL=postgresql+psycopg2://postgres:teste@localhost:15432/fitflow_teste   # PowerShell: $env:TEST_POSTGRES_URL="..."
pytest -q -rs
docker rm -f fitflow-pg-teste
```

Com a variável definida, as tabelas são criadas com `create_all` e esvaziadas com `TRUNCATE ... RESTART IDENTITY CASCADE` a cada teste. `tests/test_migracoes.py` só executa com `TEST_POSTGRES_URL` (senão é pulado): ele **zera o schema `public`** do banco apontado e roda `upgrade head → downgrade base → upgrade head` e `alembic check`. Use sempre um banco descartável.

Frontend (dentro de `frontend/`):

```bash
npm run typecheck
npm run lint       # 0 erros; 29 avisos conhecidos
npm test           # 352 testes (jest-expo); `npm run test:ci` no CI
```

E2E no navegador (Playwright sobre o build web; usa `backend/venv` e `frontend/node_modules`, então faça as etapas 2 e 5 antes):

```bash
cd e2e
npm install
npx playwright install chromium   # primeira vez
npm test                          # leva alguns minutos; ver e2e/README.md
```

O CI (`.github/workflows/ci.yml`, em todo `push` e `pull_request`; ainda não foi executado no GitHub) tem três jobs: **backend** (Python 3.13, `pytest` em SQLite), **backend-postgres** (serviço `postgres:16`, `pytest` completo e o teste de migrações) e **frontend** (Node 24, `npm ci`, typecheck, lint e jest). O E2E fica fora do CI (ADR-027).

## Segurança e acesso

O backend utiliza JWT para autenticação, hash de senhas e dependências de autorização para restringir operações conforme o perfil. Algumas operações de gerenciamento são exclusivas de professores ou administradores, enquanto o registro do histórico é restrito ao aluno autenticado.

Antes de disponibilizar a aplicação publicamente, é importante revisar configurações de CORS, gestão de segredos, permissões e armazenamento de tokens para o ambiente de produção.

## Próximos passos

O desenvolvimento segue em evolução. Entre as áreas que podem receber melhorias estão:

- Validar os fluxos mobile em dispositivo físico (Expo Go) e executar o CI no GitHub.
- Quitar a dívida técnica: religar a regra de lint `react-hooks/set-state-in-effect`, corrigir os avisos de import do axios.
- Funcionalidades deixadas de fora de propósito: ciclos de periodização, push notifications, refresh token.
- Preparar configuração de produção e deploy (CORS, segredos, token na web).

## Objetivo técnico

O FitFlow é um projeto prático para desenvolver uma aplicação full stack com separação entre API e cliente mobile. Ele reúne conceitos de modelagem relacional, autenticação, autorização, validação de dados, operações CRUD, integração com serviços externos e consumo de API em React Native.

## Licença

Consulte o arquivo [LICENSE](LICENSE) para os termos de uso e distribuição.

---

Desenvolvido por [Leonardo Gelane](https://github.com/gelane-dev).
