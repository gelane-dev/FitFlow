# FitFlow

Aplicativo mobile para gerenciamento de treinos de academia, com uma API REST para organizar usuários, exercícios, fichas e sessões de treino.

O projeto conecta um backend em **Python/FastAPI** a um aplicativo desenvolvido com **React Native e Expo**. O foco é construir fluxos reais de gerenciamento de treinos, com autenticação, permissões por perfil e persistência em banco de dados relacional.

**Status:** em desenvolvimento ativo.

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
- Migrações do banco de dados com Alembic.

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
- Armazenamento seguro de credenciais de sessão com Expo SecureStore (dependência configurada no projeto).

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
| Ferramentas | Git, GitHub |

As versões das dependências estão declaradas em `requirements.txt` e `app-academia-mobile/package.json`.

## Organização do repositório

```text
FitFlow/
├── app/
│   ├── core/          # Segurança e dependências comuns
│   ├── enums/         # Enumerações do domínio
│   ├── models/        # Modelos SQLAlchemy
│   ├── routers/       # Endpoints da API
│   ├── schemas/       # Schemas Pydantic
│   ├── services/      # Integrações e serviços
│   └── ...            # Banco de dados e configuração
├── alembic/           # Migrações do banco
├── app-academia-mobile/
│   ├── src/
│   │   ├── app/       # Telas e rotas mobile
│   │   ├── components/# Componentes reutilizáveis
│   │   ├── contexts/  # Contextos da aplicação
│   │   ├── hooks/     # Hooks de domínio e integração
│   │   └── ...        # Assets, serviços e tipos
│   └── package.json
├── requirements.txt
├── alembic.ini
└── README.md
```

## Como executar localmente

### Pré-requisitos

- Python instalado e compatível com as dependências do backend.
- PostgreSQL em execução.
- Node.js e npm.
- Expo Go ou um emulador Android/iOS para executar o aplicativo.

### 1. Clonar o projeto

```bash
git clone https://github.com/gelane-dev/FitFlow.git
cd FitFlow
```

### 2. Configurar o backend

Crie e ative um ambiente virtual na raiz do repositório.

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

Instale as dependências:

```bash
pip install -r requirements.txt
```

Configure as variáveis de ambiente necessárias para a conexão com o PostgreSQL, a chave de assinatura dos tokens e a integração com o Cloudinary. Use os nomes esperados pelo código em `app/database.py`, `app/core/seguranca.py` e `app/services/cloudinary.py`.

> Não envie arquivos `.env`, senhas, tokens ou credenciais para o repositório.

### 3. Aplicar as migrações

Com o banco criado e as variáveis de ambiente configuradas:

```bash
alembic upgrade head
```

### 4. Iniciar a API

O ponto de entrada atual da aplicação FastAPI está em `app/routers/main.py`:

```bash
uvicorn app.routers.main:app --reload
```

A API estará disponível localmente em `http://localhost:8000`. A documentação interativa fica em:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 5. Iniciar o aplicativo mobile

Em outro terminal:

```bash
cd app-academia-mobile
npm install
npx expo start
```

Configure a URL base da API conforme a configuração usada pelo aplicativo. Para testar em um celular físico, use o endereço IP local do computador em vez de `localhost`; os dois dispositivos precisam estar na mesma rede e o firewall deve permitir a conexão.

## Segurança e acesso

O backend utiliza JWT para autenticação, hash de senhas e dependências de autorização para restringir operações conforme o perfil. Algumas operações de gerenciamento são exclusivas de professores ou administradores, enquanto o registro do histórico é restrito ao aluno autenticado.

Antes de disponibilizar a aplicação publicamente, é importante revisar configurações de CORS, gestão de segredos, permissões e armazenamento de tokens para o ambiente de produção.

## Próximos passos

O desenvolvimento segue em evolução. Entre as áreas que podem receber melhorias estão:

- Completar e validar os fluxos mobile de ponta a ponta.
- Ampliar testes automatizados para API e aplicativo.
- Refinar a experiência de gerenciamento de treinos e exercícios.
- Evoluir o acompanhamento de progresso e avaliação física.
- Preparar configuração de produção e deploy.

## Objetivo técnico

O FitFlow é um projeto prático para desenvolver uma aplicação full stack com separação entre API e cliente mobile. Ele reúne conceitos de modelagem relacional, autenticação, autorização, validação de dados, operações CRUD, integração com serviços externos e consumo de API em React Native.

## Licença

Consulte o arquivo [LICENSE](LICENSE) para os termos de uso e distribuição.

---

Desenvolvido por [Leonardo Gelane](https://github.com/gelane-dev).
