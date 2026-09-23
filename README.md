# 🏋️ FitFlow — Treino & Acompanhamento

Aplicativo para gestão de treinos entre professores e alunos de academia, com montagem de fichas, acompanhamento de execução e evolução física.

Projeto solo, desenvolvido com back-end em **FastAPI/PostgreSQL** e front-end em **React Native (Expo)**.

Meu histórico é em desenvolvimento web e back-end, então este projeto é também uma forma de explorar e ganhar experiência prática em **front-end mobile**, aprendendo React Native na prática enquanto construo uma aplicação real.

---

## 📌 Status do projeto

> 🚧 Em desenvolvimento — back-end concluído, iniciando o desenvolvimento do front-end

- ✅ Modelagem do banco de dados (ERD)
- ✅ Setup do projeto FastAPI + SQLAlchemy + Alembic
- ✅ Autenticação JWT (registro, login, hash de senha)
- ✅ Rotas protegidas por perfil (professor / aluno)
- ✅ CRUD de usuários e perfis
- ✅ CRUD de exercícios (com upload de mídia via Cloudinary)
- ✅ CRUD de fichas de treino
- ✅ Periodização de treino (A/B/C por dia da semana)
- ✅ Endpoint "treino do dia"
- ✅ Endpoint de histórico de execução + feedback do aluno
- 🔜 Fundamentos de React Native e setup do app mobile
- 🔜 Telas do professor
- 🔜 Telas do aluno
- 🔜 Evolução, avaliação física e notificações
- 🔜 Deploy e apresentação

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Back-end | FastAPI |
| Banco de dados | PostgreSQL |
| ORM / Migrations | SQLAlchemy + Alembic |
| Autenticação | JWT |
| Mobile | React Native (Expo) |
| Navegação | React Navigation |
| Requisições à API | Axios |
| Upload de mídia | Cloudinary |
| Notificações push | Expo Notifications |
| Hospedagem back-end | Railway / Render |
| Hospedagem banco | Supabase / Railway |

---

## 🗂️ Modelagem de dados

Entidades principais: `User`, `Professor`, `Aluno`, `Exercicio`, `Ficha`, `ItemFicha`, `HistoricoExecucao`, `AvaliacaoFisica`.

---

## ⚙️ Funcionalidades implementadas (back-end)

- **Autenticação e perfis**: registro/login com JWT, senhas com hash (bcrypt), rotas separadas por perfil de professor e aluno.
- **Exercícios**: cadastro com nome, grupo muscular e vídeo/imagem (Cloudinary).
- **Fichas de treino**: criação com séries, repetições, carga e descanso, vinculadas a um aluno.
- **Periodização**: organização de treinos A/B/C por dia da semana.
- **Treino do dia**: endpoint que retorna automaticamente a ficha correta com base no dia.
- **Histórico**: registro de execuções e feedback do aluno pós-treino.

## 📱 Próximas funcionalidades (front-end)

- Login/cadastro e navegação (React Navigation)
- Biblioteca de exercícios (professor)
- Montagem de ficha de treino (formulário dinâmico)
- Listagem de alunos e vínculo com fichas
- Tela "treino do dia" com checklist de execução
- Cronômetro de descanso
- Gráficos de progressão de carga
- Cadastro de medidas corporais e fotos de progresso
- Notificações push (treino liberado, avisos)

---

## 🚀 Como rodar o projeto (back-end)

```bash
# clonar o repositório
git clone https://github.com/gelane-dev/app-academia
cd app-academia

# criar e ativar ambiente virtual
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# instalar dependências
pip install -r requirements.txt

# configurar variáveis de ambiente
cp .env.example .env
# preencher DATABASE_URL, SECRET_KEY, CLOUDINARY_URL etc.

# rodar migrations
alembic upgrade head

# subir o servidor
uvicorn app.main:app --reload
```

A documentação interativa da API fica disponível em `http://localhost:8000/docs`.

## 📲 Como rodar o projeto (mobile — em construção)

```bash
cd mobile
npm install
npx expo start
```

---

## 🎯 Objetivo do projeto

A ideia é entregar um app funcional para uso real em academia, permitindo que o professor monte e gerencie fichas de treino para seus alunos, e que o aluno acompanhe seu treino do dia, execute os exercícios e visualize sua evolução ao longo do tempo.

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
