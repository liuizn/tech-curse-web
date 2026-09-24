# CLAUDE.md

Front-end Angular da **Tech Curse** (plataforma de cursos). Consome a Tech Curse API (repositório irmão `../tech-curse`, .NET 10).

> O projeto é documentado em **português brasileiro**: commits, docs, textos de UI e identificadores em pt-BR. Comentários em código são permitidos, mas só quando explicam um porquê não óbvio.

## Comandos

```bash
npm start            # ng serve em http://localhost:4200
npm test             # Vitest (unitários); --include "**/x.spec.ts" para um arquivo
npm run e2e          # Playwright; exige Docker (docker-compose up -d em ../tech-curse) e Playwright Chromium (npx playwright install chromium); o fluxo do portal exige E2E_ADMIN_EMAIL/E2E_ADMIN_SENHA iguais ao Seed:Admin:* da API (sem eles, é pulado)
npm run lint         # angular-eslint
npm run format       # prettier (ordena classes Tailwind)
npx ng g @spartan-ng/cli:ui <primitivo>  # components.json define o destino (src/app/shared/ui)
```

## Arquitetura

- Angular 22, standalone, signals, zoneless. Estado em services com signals; leitura remota via `httpResource`.
- `src/app/core/` — auth (`AutenticacaoService`, `tokenInterceptor`, guards), http (`erroInterceptor` → `ErroApi`), api (services + modelos dos DTOs), notificacao (toasts), tema (claro/escuro), layout (shell e público).
- `src/app/shared/ui/` — componentes helm do spartan copiados pelo CLI; importados por `@spartan-ng/helm/<primitivo>`. **Não edite à mão** o que o CLI gerou sem motivo; para trocar cores use `src/styles.css` (tema exportado do SimUI).
- `src/app/features/` — uma pasta por área (`auth`, `catalogo`, `aluno`, `admin`, `erros`), cada uma com suas rotas lazy.
- `core/aluno/` — `PerfilAlunoService` (perfil do `/Student/me` e matrículas em signals; estado `inativo | carregando | pendente | ativo | erro`), lido pelo catálogo, pelo detalhe e pela área `/aluno`.
- Ordem dos interceptors em `app.config.ts`: `[erroInterceptor, tokenInterceptor]` — o de token vê o 401 cru antes da conversão para `ErroApi`.

## Backend

- Base de desenvolvimento: `http://localhost:5130/tech-curse` (`environment.development.ts`).
- Claims do JWT: `nameid`, `email`, `role`. Erros em `ProblemDetails`; `422` traz `errors` com **códigos do Identity** (`PasswordRequiresDigit`, `DuplicateEmail`, ...), mapeados para campos em `RegistrarComponent`.
- `UserName` = nome informado no registro e não aceita espaços (regra padrão do Identity).

## Fases

1. Fundação (esta) — spec em `docs/superpowers/specs/2026-09-18-fundacao-angular-design.md`.
2. Portal do aluno — matrícula, `/me`, pagamentos. Spec em `docs/superpowers/specs/2026-09-23-portal-do-aluno-design.md`.
3. Painel administrativo — CRUD de cursos/estudantes, pagamentos.

## Decisões registradas

- `erroInterceptor` também silencia `400` (além de `401`/`422`) — os formulários tratam esse status inline (ex.: credenciais inválidas no login).
- A ordem das rotas `''` em `app.routes.ts` é obrigatória: o bloco do `ShellComponent` vem ANTES do bloco do `PublicoLayoutComponent`. O recognizer do Angular casa a primeira rota `''` por prefixo; se o layout público viesse primeiro, `/` carregaria `AUTH_ROUTES` sem filho para o restante vazio e nunca chegaria ao redirect `'' → cursos` do shell. Ver `app.routes.spec.ts`.
- `roleGuard` roda em `canMatch` (preserva o lazy-skip) e, quando `auth.role() === null` (anônimo), redireciona direto para `/entrar` com `returnUrl` — em vez de cair em `/sem-permissao` e só depois ser redirecionado pelo `autenticadoGuard` (o que faria o usuário, após logar, parar em "Sem permissão" em vez da rota pretendida).
- Erros `422` no registro são distribuídos por um mapa em signal (código do Identity → campo), não por `setErrors` do Reactive Forms.
- Tema em HEX (exportação padrão do SimUI) — ver `src/styles.css`.
- Produção assume proxy reverso na mesma origem (`apiUrl: '/tech-curse'`); ajustar `environment.ts` no deploy.
- `SILENCIAR_ERRO` (`HttpContextToken` do `erroInterceptor`): a requisição converte o erro para `ErroApi` mas não mostra toast. Usado pelo `/Student/me`, cujo 404 é o estado "perfil pendente".
- Erros de `httpResource` podem chegar embrulhados (`cause`); leia com `extrairErroApi`.
- Estado de listas (página, ordem, categoria) fica na query string e chega aos componentes como inputs (`withComponentInputBinding`).
- Locale `pt-BR` e moeda `BRL` registrados no `app.config.ts`.

## Git

Branch `main`. Conventional Commits em pt-BR (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`, `style:`, `build:`, `ci:`). Sem linhas de atribuição de IA em commits ou PRs.
