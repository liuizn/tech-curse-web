# Tech Curse Web

Front-end Angular 22 da plataforma Tech Curse. Consome a [Tech Curse API](../tech-curse).

## Requisitos

- Node.js ≥ 24.15
- API rodando localmente (`docker-compose up -d` no repositório `tech-curse`)

## Rodando

```bash
npm install
npm start
```

Abra http://localhost:4200. Registre-se como aluno em `/registrar` e entre em `/entrar`.

## Testes

```bash
npm test
npm run e2e
```

O fluxo do portal do aluno precisa do Admin semeado da API (em `../tech-curse`, `dotnet user-secrets set "Seed:Admin:Email" ...` e `"Seed:Admin:Password" ...`) e das mesmas credenciais aqui:

```bash
E2E_ADMIN_EMAIL=admin@techcurse.dev E2E_ADMIN_SENHA='<senha>' npm run e2e
```

## Stack

Angular 22 · Tailwind CSS 4 · spartan/ui · tema SimUI · Vitest · Playwright
