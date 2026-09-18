# Tech Curse Web — Fase 1: Fundação Angular

**Data:** 2026-09-18
**Status:** aprovado em brainstorming, aguardando plano de implementação

## Contexto

O backend **Tech Curse API** (repositório irmão `../tech-curse`, .NET 10) já existe e expõe uma API REST para uma plataforma de cursos: autenticação JWT com refresh token, catálogo de cursos, estudantes, matrículas e pagamentos, com três roles (`Admin`, `Instructor`, `Student`). O CORS de desenvolvimento já libera `http://localhost:4200`.

Este repositório (`tech-curse-web`) é o front-end Angular que consome essa API. O produto final cobre **portal do aluno** e **painel administrativo**, decomposto em três fases, cada uma com seu próprio spec → plano → implementação:

1. **Fundação** (este spec) — scaffold, tema, layout, autenticação, guards, cliente HTTP, tratamento de erros, listagem de cursos como prova do pipeline.
2. **Portal do aluno** — catálogo completo, matrícula, perfil (`/me`), meus pagamentos.
3. **Painel administrativo** — CRUD de cursos e estudantes, gestão de pagamentos (processar/estornar).

As decisões de arquitetura desta fase consideram as três.

## Contrato da API relevante

Base: `http://localhost:5130/tech-curse` (desenvolvimento).

| Método | Rota | Acesso | Corpo / Resposta |
|---|---|---|---|
| POST | `/Auth/register` | público | `{ name, email, role, password, confirmPassword }` → 201 `{ mensagem }` |
| POST | `/Auth/login` | público | `{ email, password }` → 200 `{ accessToken, refreshToken, expiresAt }` |
| POST | `/Auth/refresh` | público | `{ accessToken, refreshToken }` → 200 `{ accessToken, refreshToken, expiresAt }` |
| GET | `/Course` | autenticado | listagem paginada de cursos |
| GET | `/Course/{id}` | autenticado | detalhe |
| GET | `/Student/me` | Student | perfil do aluno logado |

Erros seguem `ProblemDetails`: `{ status, title, detail }`, com `errors: Record<string, string[]>` adicional em `422`. Códigos usados pelo backend: 400, 401, 403, 404, 409, 422, 429, 500, 504.

A role do usuário vem como claim no payload do JWT.

## Decisões

| Tema | Decisão | Motivo |
|---|---|---|
| Framework | Angular 22.1, standalone, signals, zoneless | versão atual; padrão moderno |
| Estilo | Tailwind CSS v4 | exigido pelo spartan |
| Componentes | spartan/ui 1.4 (`@spartan-ng/brain` via npm, helm copiado para `shared/ui`) + componentes copy-paste do SimUI | escolha do usuário; controle total sobre os estilos |
| Tema | variáveis OKLch geradas no editor de tema do SimUI, coladas em `styles.css` (claro + escuro) | escolha do usuário |
| Estado | signals em services injetáveis; `httpResource` para leitura remota | suficiente para o escopo, zero dependências |
| Tokens | `localStorage` | sessão sobrevive a reload; refresh token é protegido por hash no backend |
| Estrutura | Angular CLI único, feature-folders com rotas lazy | simples, lazy por área, `ng generate` funciona direto |
| Testes | Vitest (unitários) + Playwright (E2E) | escolha do usuário |
| Lint/format | `angular-eslint` + Prettier com `prettier-plugin-tailwindcss` | ordenação de classes Tailwind |
| Idioma | pt-BR em commits, docs, UI e identificadores; comentários permitidos | consistência com o backend, sem a proibição de comentários |
| Git | `git init` local, branch `main`, Conventional Commits em pt-BR; remote fica com o usuário | mesma convenção do backend |

## Estrutura de pastas

```
src/
  app/
    core/
      auth/
        autenticacao.service.ts        estado da sessão (signals + localStorage)
        token.interceptor.ts           Bearer + refresh em 401
        autenticado.guard.ts
        role.guard.ts
        anonimo.guard.ts               já logado → redireciona
        jwt.ts                         decodificação do payload
      http/
        erro.interceptor.ts            HttpErrorResponse → ErroApi
        erro-api.ts                    tipo ErroApi
      api/
        modelos/                       tipos espelhando os DTOs do backend
        curso.service.ts
      notificacao/
        notificacao.service.ts         toasts (hlm-sonner)
      layout/
        shell/                         header + navegação por role + router-outlet
        publico/                       layout das telas de entrar/registrar
    shared/
      ui/                              helm do spartan + componentes do SimUI
    features/
      auth/
        entrar/
        registrar/
        auth.routes.ts
      catalogo/
        lista-cursos/
        catalogo.routes.ts
      aluno/                           placeholder (Fase 2)
      admin/                           placeholder (Fase 3)
      erros/
        sem-permissao/
        nao-encontrado/
    app.config.ts
    app.routes.ts
    app.ts
  environments/
    environment.ts                     apiUrl: http://localhost:5130/tech-curse
    environment.production.ts          apiUrl: a definir
e2e/
  entrar.spec.ts
  rota-protegida.spec.ts
  playwright.config.ts
```

## Autenticação

### `AutenticacaoService`

- Signals privados: `accessToken`, `refreshToken`, `expiresAt`, inicializados de `localStorage` no construtor.
- Computeds públicos: `usuario` (`{ email, role } | null`, decodificado do payload do JWT), `estaAutenticado` (`accessToken` presente e `expiresAt` no futuro), `role`.
- Métodos:
  - `entrar(email, senha)`: `POST /Auth/login`, persiste os três valores, retorna `Promise<void>`.
  - `registrar(dados)`: `POST /Auth/register` com `role: 'Student'` fixo nesta fase.
  - `renovar()`: `POST /Auth/refresh` com os dois tokens atuais; persiste o novo par. Compartilha uma única `Promise` em andamento (mutex) para que chamadas concorrentes esperem o mesmo refresh.
  - `sair()`: limpa signals e `localStorage`, navega para `/entrar`.
- Persistência: uma chave única `tech-curse.sessao` em `localStorage` com o JSON `{ accessToken, refreshToken, expiresAt }`. Leitura defensiva: JSON inválido → sessão vazia.

### Decodificação do JWT (`jwt.ts`)

Função pura `decodificarPayload(token): Record<string, unknown> | null` — base64url do segundo segmento, sem verificação de assinatura (isso é papel do backend). A role vem da claim `role` ou do nome longo `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`; o e-mail da claim `email` ou do nome longo equivalente. O plano de implementação deve confirmar os nomes exatos inspecionando um token real.

### `tokenInterceptor`

1. Se a URL começa com `environment.apiUrl` e há `accessToken`, adiciona `Authorization: Bearer <token>`.
2. Requisições para `/Auth/login`, `/Auth/register` e `/Auth/refresh` **não** entram na lógica de retry.
3. Em `401`: chama `renovar()`; se resolver, repete a requisição original com o novo token **uma vez**; se rejeitar, chama `sair()` (que navega para `/entrar?returnUrl=<url atual>`) e propaga o erro.

### Guards (funcionais)

- `autenticadoGuard`: `estaAutenticado` ou redireciona para `/entrar?returnUrl=<state.url>`.
- `roleGuard(roles: Role[])`: fábrica que retorna um `CanActivateFn`/`CanMatchFn`; se a role do usuário não está na lista, redireciona para `/sem-permissao`.
- `anonimoGuard`: se já autenticado, redireciona para a rota inicial da role.

### Redirecionamento pós-login

Função `rotaInicialPorRole(role)`: `Student → /cursos`, `Admin | Instructor → /admin`. Se houver `returnUrl` na query, ela tem precedência.

## Roteamento

```
''              → ShellComponent (canActivate: autenticadoGuard)
  ''            → redirect /cursos
  'cursos'      → lazy features/catalogo
  'aluno'       → lazy features/aluno   (canMatch: roleGuard(['Student']))            placeholder
  'admin'       → lazy features/admin   (canMatch: roleGuard(['Admin','Instructor'])) placeholder
'entrar'        → PublicoLayout + EntrarComponent    (canActivate: anonimoGuard)
'registrar'     → PublicoLayout + RegistrarComponent (canActivate: anonimoGuard)
'sem-permissao' → SemPermissaoComponent
'**'            → NaoEncontradoComponent
```

## Layout

- **`ShellComponent`**: header com nome do produto, links de navegação filtrados pela role (`Cursos` para todos; `Admin` só para Admin/Instructor), e-mail do usuário e botão **Sair**. Conteúdo em `<router-outlet>`. Responsivo: navegação colapsa em menu no mobile (spartan `hlm-sheet` ou equivalente do SimUI).
- **`PublicoLayout`**: cartão centralizado, sem navegação.
- Modo escuro: classe `dark` no `<html>`, alternável por um botão no header; preferência guardada em `localStorage` (`tech-curse.tema`), padrão segue `prefers-color-scheme`.

## HTTP e erros

### `ErroApi`

```ts
interface ErroApi {
  status: number;
  titulo: string;
  detalhe: string;
  erros?: Record<string, string[]>;
}
```

### `erroInterceptor`

Converte todo `HttpErrorResponse` da API em `ErroApi` (lendo `ProblemDetails`; se o corpo não for JSON, `titulo`/`detalhe` genéricos por status; status `0` → "Não foi possível conectar ao servidor"). Rejeita com `ErroApi`.

Política de notificação:
- `422` → **não** notifica; o componente distribui `erros` nos controles do formulário (`setErrors({ api: mensagem })`).
- `401` já tratado pelo `tokenInterceptor` (ordem: `erroInterceptor` registrado **antes** do `tokenInterceptor`, para que o token veja o erro cru).
- Demais → `NotificacaoService.erro(detalhe)`.

### `NotificacaoService`

Fina camada sobre `hlm-sonner`: `sucesso(msg)`, `erro(msg)`, `info(msg)`.

### Services de domínio

`CursoService.listar(pagina, tamanho)` via `httpResource` retornando o tipo paginado do backend. Os tipos em `core/api/modelos` são escritos à mão a partir dos DTOs do backend (o plano deve ler `src/Application/DTOs` no repo irmão para os nomes exatos dos campos).

## Telas da Fase 1

| Rota | Conteúdo |
|---|---|
| `/entrar` | e-mail + senha, botão Entrar, link para registrar; erros de 400/401 aparecem como mensagem no cartão |
| `/registrar` | nome, e-mail, senha, confirmação; validação síncrona (obrigatórios, e-mail válido, senhas iguais); em sucesso, toast + redirect para `/entrar` |
| `/cursos` | cards paginados com nome e descrição; estados de carregando/vazio/erro |
| `/admin` | placeholder "Painel administrativo — em breve" |
| `/sem-permissao`, `/**` | páginas simples com link para a home |

Formulários usam Reactive Forms tipados com componentes de formulário do spartan (`hlm-input`, `hlm-button`, `hlm-form-field`).

## Testes

### Unitários (Vitest, `ng test`)

- `jwt.ts`: decodifica payload válido; retorna `null` para token malformado.
- `AutenticacaoService`: carrega sessão do `localStorage`; `entrar` persiste; `sair` limpa; `estaAutenticado` respeita `expiresAt`; `renovar` concorrente faz um único `POST /Auth/refresh` (via `HttpTestingController`).
- `tokenInterceptor`: anexa header só para a API; em 401 renova e repete uma vez; se o refresh falha, chama `sair()`; não tenta refresh em `/Auth/*`.
- `erroInterceptor`: mapeia `ProblemDetails` 404/422/500 e status 0 para `ErroApi`.
- Guards: os três, com `Router` mockado verificando o `UrlTree` retornado.
- `EntrarComponent` e `RegistrarComponent`: validação síncrona, distribuição de `erros` do 422 nos controles.
- `rotaInicialPorRole`.

### E2E (Playwright, `npm run e2e`)

Pré-condição: API rodando (`docker-compose up -d` no repo `tech-curse`). URL lida de `API_URL` (padrão `http://localhost:5130`); base do front `http://localhost:4200`, servido pelo `webServer` do Playwright (`ng serve`).

1. **Registrar e entrar**: registra um e-mail único por execução (`aluno+<timestamp>@teste.dev`), entra, verifica que `/cursos` renderiza o header com o e-mail.
2. **Rota protegida**: acessa `/cursos` sem sessão → está em `/entrar?returnUrl=%2Fcursos`; entra → volta para `/cursos`.

## Comandos (a documentar no `CLAUDE.md` do projeto)

```
npm start          ng serve (porta 4200)
npm test           vitest
npm run e2e        playwright test
npm run lint       eslint
npm run format     prettier --write
ng g @spartan-ng/cli:ui <componente>   adiciona um componente helm em shared/ui
```

## Fora de escopo desta fase

- Qualquer tela de aluno além da listagem de cursos (matrícula, `/me`, pagamentos) — Fase 2.
- Qualquer tela administrativa — Fase 3.
- Criação de usuários Admin/Instructor pelo front.
- Recuperação de senha (o backend não oferece).
- CI/CD, Dockerfile, deploy e URL de produção.
- Internacionalização (a UI é só pt-BR).

## Riscos e pontos a confirmar no plano

- Nomes exatos das claims de role/e-mail no JWT do backend.
- Forma exata do DTO paginado de `GET /Course` (campos de itens, total, página).
- Compatibilidade do `@spartan-ng/cli:init` com Angular 22.1 (o peer range é `>=21 <23`, então deve funcionar; validar no scaffold).
- O editor de tema do SimUI produz variáveis no formato que o spartan 1.4 espera (OKLch); se divergir, ajustar nomes das variáveis manualmente.
