# CLAUDE.md

Front-end Angular da **Tech Curse** (plataforma de cursos). Consome a Tech Curse API (repositório irmão `../tech-curse`, .NET 10).

> O projeto é documentado em **português brasileiro**: commits, docs, textos de UI e identificadores em pt-BR. Comentários em código são permitidos, mas só quando explicam um porquê não óbvio.

## Comandos

```bash
npm start            # ng serve em http://localhost:4200
npm test             # Vitest (unitários); --include "**/x.spec.ts" para um arquivo
npm run e2e          # Playwright; exige Docker (docker-compose up -d em ../tech-curse) e Playwright Chromium (npx playwright install chromium)
npm run lint         # angular-eslint
npm run format       # prettier (ordena classes Tailwind)
npx ng g @spartan-ng/cli:ui <primitivo>  # components.json define o destino (src/app/shared/ui)
```

## Arquitetura

- Angular 22, standalone, signals, zoneless. Estado em services com signals; leitura remota via `httpResource`.
- `src/app/core/` — auth (`AutenticacaoService`, `tokenInterceptor`, guards), http (`erroInterceptor` → `ErroApi`), api (services + modelos dos DTOs), notificacao (toasts), tema (claro/escuro), layout (shell e público).
- `src/app/shared/ui/` — componentes helm do spartan copiados pelo CLI; importados por `@spartan-ng/helm/<primitivo>`. **Não edite à mão** o que o CLI gerou sem motivo; para trocar cores use `src/styles.css` (tema exportado do SimUI).
- `src/app/features/` — uma pasta por área (`auth`, `catalogo`, `aluno`, `admin`, `erros`), cada uma com suas rotas lazy.
- Ordem dos interceptors em `app.config.ts`: `[erroInterceptor, tokenInterceptor]` — o de token vê o 401 cru antes da conversão para `ErroApi`.

## Backend

- Base de desenvolvimento: `http://localhost:5130/tech-curse` (`environment.development.ts`).
- Claims do JWT: `nameid`, `email`, `role`. Erros em `ProblemDetails`; `422` traz `errors` com **códigos do Identity** (`PasswordRequiresDigit`, `DuplicateEmail`, ...), mapeados para campos em `RegistrarComponent`.
- `UserName` = nome informado no registro e não aceita espaços (regra padrão do Identity).

## Fases

1. Fundação (esta) — spec em `docs/superpowers/specs/2026-09-18-fundacao-angular-design.md`.
2. Portal do aluno — matrícula, `/me`, pagamentos.
3. Painel administrativo — CRUD de cursos/estudantes, pagamentos.

## Git

Branch `main`. Conventional Commits em pt-BR (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`, `style:`, `build:`, `ci:`). Sem linhas de atribuição de IA em commits ou PRs.
