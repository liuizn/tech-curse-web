# Plano de Implementação — Fase 1: Fundação Angular

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o front-end Angular da Tech Curse com scaffold, tema, layout, autenticação JWT (login/registro/refresh), guards por role, cliente HTTP com tratamento de erros e a listagem de cursos como prova do pipeline ponta a ponta.

**Architecture:** Angular CLI único, standalone + signals + zoneless, feature-folders com rotas lazy. `core/` concentra auth, HTTP, notificação e layout; `shared/ui/` recebe os componentes helm do spartan copiados pelo CLI; `features/` tem uma pasta por área (auth, catalogo, aluno, admin, erros). Estado em services com signals; leitura remota via `httpResource`.

**Tech Stack:** Angular 22.1, TypeScript, Tailwind CSS v4, spartan/ui 1.4 (`@spartan-ng/brain` + helm), tema SimUI, Vitest (unitários), Playwright (E2E), angular-eslint, Prettier + `prettier-plugin-tailwindcss`.

**Spec:** `docs/superpowers/specs/2026-09-18-fundacao-angular-design.md`

## Global Constraints

- **Node.js ≥ 24.15.0** (o Angular CLI 22 recusa 24.11.1). Pré-requisito manual: `winget install --id OpenJS.NodeJS.LTS -e` e reabrir o terminal; confirmar com `node -v`.
- Angular **22.1.x**; `@spartan-ng/cli` e `@spartan-ng/brain` **1.4.1**; Tailwind **4.x**.
- Backend em `http://localhost:5130/tech-curse` (rotas `/Auth`, `/Course`, `/Student`, ...). CORS já libera `http://localhost:4200`.
- Idioma: **pt-BR** em commits, docs, textos de UI e identificadores. Comentários são permitidos, mas escreva-os só quando explicarem um porquê não óbvio.
- Commits: Conventional Commits em pt-BR (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`, `style:`, `build:`, `ci:`). **Sem** linhas `Co-Authored-By`, "Generated with" ou qualquer assinatura de IA (regra global do usuário).
- Não há remote git; commits são locais no branch `main`.
- Sessão persistida em `localStorage` na chave `tech-curse.sessao`; tema em `tech-curse.tema`.
- Claims do JWT emitido pelo backend (`JwtSecurityTokenHandler` mapeia os nomes curtos): `nameid`, `email`, `role` (string ou array). Manter fallback para os nomes longos `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` e `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`.
- Erros `422` do backend usam como chave de `errors` **códigos do ASP.NET Identity** (`PasswordRequiresDigit`, `DuplicateUserName`, `DuplicateEmail`, `InvalidUserName`, ...) ou `Password` — não nomes de campos. O mapeamento para controles do formulário está na Task 12.
- Regras de senha do backend (espelhadas no front): mínimo 8 caracteres, 1 dígito, 1 maiúscula, 1 minúscula, 1 não alfanumérico. `UserName` = `Name` no backend e só aceita `A-Za-z0-9-._@+` (sem espaços).
- Componentes helm são importados pelo alias `@spartan-ng/helm/<primitivo>` (path mapping criado pelo CLI do spartan em `tsconfig.json`), com os arquivos físicos em `src/app/shared/ui/<primitivo>/src/`.
- Desvios deliberados do spec (menor risco, mesma função): (1) o CLI do Angular gera `environment.ts` (produção) + `environment.development.ts` (dev) em vez de `environment.production.ts`; (2) a navegação mobile do shell usa um `<nav>` alternado por signal em vez de `hlm-sheet`; (3) erros de formulário usam `<p>` simples em vez de `hlm-field-error`.

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/environments/environment.ts`, `environment.development.ts` | `apiUrl` por ambiente |
| `src/app/core/http/erro-api.ts` | tipo `ErroApi` + `ehErroApi()` |
| `src/app/core/http/erro.interceptor.ts` | `HttpErrorResponse` → `ErroApi` |
| `src/app/core/auth/jwt.ts` | `decodificarPayload`, `extrairUsuario` |
| `src/app/core/auth/sessao.ts` | tipo `Sessao`, chave de storage, `lerSessao`/`gravarSessao`/`limparSessao` |
| `src/app/core/auth/autenticacao.service.ts` | `AutenticacaoService` |
| `src/app/core/auth/token.interceptor.ts` | Bearer + refresh em 401 |
| `src/app/core/auth/rota-inicial.ts` | `rotaInicialPorRole` |
| `src/app/core/auth/autenticado.guard.ts`, `role.guard.ts`, `anonimo.guard.ts` | guards funcionais |
| `src/app/core/notificacao/notificacao.service.ts` | toasts |
| `src/app/core/tema/tema.service.ts` | claro/escuro |
| `src/app/core/layout/shell/shell.ts` + `.html` | header, navegação, `router-outlet` |
| `src/app/core/layout/publico/publico.ts` + `.html` | cartão central para auth |
| `src/app/core/api/modelos/paginacao.ts`, `curso.ts` | tipos dos DTOs |
| `src/app/core/api/curso.service.ts` | `CursoService` |
| `src/app/features/auth/entrar/entrar.ts` + `.html`, `registrar/registrar.ts` + `.html`, `auth.routes.ts` | telas de auth |
| `src/app/features/auth/validadores.ts` | validadores de senha/nome/confirmação |
| `src/app/features/catalogo/lista-cursos/lista-cursos.ts` + `.html`, `catalogo.routes.ts` | listagem paginada |
| `src/app/features/admin/admin.routes.ts` + `painel/painel.ts`, `features/aluno/aluno.routes.ts` | placeholders |
| `src/app/features/erros/sem-permissao/sem-permissao.ts`, `nao-encontrado/nao-encontrado.ts` | 403/404 |
| `src/app/app.routes.ts`, `app.config.ts`, `app.ts`, `app.html` | raiz |
| `e2e/playwright.config.ts`, `e2e/entrar.spec.ts`, `e2e/rota-protegida.spec.ts` | E2E |
| `CLAUDE.md`, `README.md` | docs do projeto |

---

### Task 1: Scaffold Angular 22 com Tailwind

**Files:**
- Create: tudo que `ng new` gera (`package.json`, `angular.json`, `tsconfig*.json`, `src/**`, `.postcssrc.json`, `.gitignore`, `.editorconfig`)
- Modify: `src/app/app.html` (limpar conteúdo de exemplo)

**Interfaces:**
- Produces: workspace Angular com `npm start` (porta 4200), `npm test` (Vitest), `src/styles.css` com `@import "tailwindcss";`.

- [ ] **Step 1: Confirmar o Node**

Run: `node -v`
Expected: `v24.15.0` ou superior. Se menor, pare e peça ao usuário para atualizar (`winget install --id OpenJS.NodeJS.LTS -e`).

- [ ] **Step 2: Gerar o workspace na pasta atual**

Run (na raiz do repositório, que já contém `.git`, `.claude` e `docs`):

```bash
npx -y @angular/cli@22 new tech-curse-web --directory . --style=tailwind --ssr=false --zoneless --routing --skip-git --package-manager=npm --ai-config=none --defaults
```

Expected: cria `package.json`, `angular.json`, `src/`, instala dependências. Se o CLI recusar por a pasta não estar vazia, repita com `--force`.

- [ ] **Step 3: Verificar versões e o runner de testes**

Run: `npx ng version | grep -E "Angular CLI|@angular/core|tailwind"` e `cat angular.json | grep -A3 '"test"'`
Expected: Angular CLI 22.1.x, `@angular/core` 22.1.x, `tailwindcss` 4.x; o target `test` usa o builder `@angular/build:unit-test` (Vitest).

- [ ] **Step 4: Limpar o template de exemplo**

Substitua o conteúdo de `src/app/app.html` por:

```html
<router-outlet />
```

E `src/app/app.ts` por:

```ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {}
```

Apague `src/app/app.css` se existir e remova `styleUrl` do componente. Ajuste `src/app/app.spec.ts` para:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('deve criar o componente raiz', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
```

- [ ] **Step 5: Rodar os testes e o build**

Run: `npm test -- --watch=false` e `npx ng build`
Expected: 1 teste passando; build sem erros.

- [ ] **Step 6: Título e idioma do documento**

Em `src/index.html`, troque `<html lang="en">` por `<html lang="pt-BR">` e `<title>` por `Tech Curse`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: criar workspace angular 22 com tailwind e vitest"
```

---

### Task 2: spartan/ui, tema SimUI e modo escuro

**Files:**
- Create: `components.json`, `src/app/shared/ui/**` (gerado), `src/app/core/tema/tema.service.ts`, `src/app/core/tema/tema.service.spec.ts`
- Modify: `src/styles.css`, `tsconfig.json` (paths, gerado), `tsconfig.app.json` (include, gerado), `src/index.html`

**Interfaces:**
- Produces: alias `@spartan-ng/helm/{utils,button,input,label,card,skeleton,spinner,sonner,pagination}`; `TemaService` com `escuro: Signal<boolean>` e `alternar(): void`.

- [ ] **Step 1: Instalar o CLI e inicializar**

```bash
npm i -D @spartan-ng/cli@1.4.1
npx ng g @spartan-ng/cli:init --project=tech-curse-web --theme=neutral --stylesEntryPoint=src/styles.css
npm install
```

Expected: `package.json` ganha `@spartan-ng/brain`, `@angular/cdk`, `tailwind-merge`, `tw-animate-css`; `src/styles.css` agora começa com `@layer theme, base, components, utilities;`, importa `tailwindcss/*` e `@spartan-ng/brain/hlm-tailwind-preset.css`, e tem blocos `:root` e `:root.dark`.

- [ ] **Step 2: Configurar o destino dos componentes**

Crie `components.json` na raiz:

```json
{
  "componentsPath": "src/app/shared/ui",
  "style": "vega",
  "importAlias": "@spartan-ng/helm"
}
```

- [ ] **Step 3: Copiar os primitivos usados na Fase 1**

```bash
for p in utils button input label card skeleton spinner sonner pagination; do npx ng g @spartan-ng/cli:ui $p --angularCli=true --directory=src/app/shared/ui; done
npm install
```

Expected: pastas `src/app/shared/ui/<p>/src/index.ts`; `tsconfig.json` ganha `paths` `@spartan-ng/helm/<p>`; `package.json` ganha `@ng-icons/core`, `@ng-icons/lucide`, `class-variance-authority`, `clsx`. Se o gerador pedir confirmação interativa, responda aceitando os padrões.

- [ ] **Step 4: Aplicar o tema do SimUI**

Abra https://simui.dev/theme-editor, ajuste as cores desejadas, clique em **View codes** e copie o CSS. No `src/styles.css`, substitua **inteiramente** os blocos `:root { ... }` e `:root.dark { ... }` gerados pelo spartan pelos blocos `:root` e `:root.dark` do SimUI; cole o bloco `@theme inline { ... }` do SimUI logo depois deles (se o spartan já tiver um `@theme inline`, mescle as variáveis sem duplicar chaves). Mantenha o `@layer base { ... }` do spartan no fim do arquivo. Se o usuário ainda não escolheu cores, use a exportação padrão do editor.

- [ ] **Step 5: Escrever o teste do `TemaService`**

`src/app/core/tema/tema.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { TemaService, CHAVE_TEMA } from './tema.service';

describe('TemaService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    TestBed.resetTestingModule();
  });

  it('usa a preferência gravada em localStorage', () => {
    localStorage.setItem(CHAVE_TEMA, 'escuro');
    const servico = TestBed.inject(TemaService);
    expect(servico.escuro()).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('alternar troca a classe dark e persiste', () => {
    localStorage.setItem(CHAVE_TEMA, 'claro');
    const servico = TestBed.inject(TemaService);
    servico.alternar();
    expect(servico.escuro()).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(CHAVE_TEMA)).toBe('escuro');
  });
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npm test -- --watch=false --include "**/tema.service.spec.ts"`
Expected: FAIL (módulo `./tema.service` não encontrado).

- [ ] **Step 7: Implementar `TemaService`**

`src/app/core/tema/tema.service.ts`:

```ts
import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';

export const CHAVE_TEMA = 'tech-curse.tema';

type Tema = 'claro' | 'escuro';

function lerPreferencia(): Tema {
  try {
    const gravado = localStorage.getItem(CHAVE_TEMA);
    if (gravado === 'claro' || gravado === 'escuro') return gravado;
  } catch {
    /* localStorage indisponível */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly documento = inject(DOCUMENT);
  private readonly tema = signal<Tema>(lerPreferencia());

  readonly escuro = computed(() => this.tema() === 'escuro');

  constructor() {
    effect(() => {
      const escuro = this.tema() === 'escuro';
      this.documento.documentElement.classList.toggle('dark', escuro);
      try {
        localStorage.setItem(CHAVE_TEMA, this.tema());
      } catch {
        /* localStorage indisponível */
      }
    });
  }

  alternar(): void {
    this.tema.update((atual) => (atual === 'escuro' ? 'claro' : 'escuro'));
  }
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npm test -- --watch=false --include "**/tema.service.spec.ts"`
Expected: 2 testes passando. (Se `effect` não tiver rodado antes do `expect`, chame `TestBed.tick()` — disponível no Angular 22 — após `inject` e após `alternar()` nos testes.)

- [ ] **Step 9: Prova visual do tema**

Em `src/app/app.html` coloque temporariamente:

```html
<main class="bg-background text-foreground min-h-screen p-8">
  <button hlmBtn>Botão spartan</button>
</main>
```

e em `app.ts` adicione `HlmButtonImports` (de `@spartan-ng/helm/button`) ao array `imports`. Run: `npx ng build`. Expected: build sem erros. Depois volte `app.html` para `<router-outlet />` e remova o import.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: adicionar spartan/ui com tema do simui e alternancia de modo escuro"
```

---

### Task 3: ESLint, Prettier e scripts npm

**Files:**
- Create: `.prettierrc`, `.prettierignore`, `eslint.config.js` (gerado)
- Modify: `package.json` (scripts)

- [ ] **Step 1: Instalar**

```bash
npx ng add angular-eslint --skip-confirmation
npm i -D prettier prettier-plugin-tailwindcss
```

- [ ] **Step 2: Configurar o Prettier**

`.prettierrc`:

```json
{
  "singleQuote": true,
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindStylesheet": "./src/styles.css",
  "overrides": [{ "files": "*.html", "options": { "parser": "angular" } }]
}
```

`.prettierignore`:

```
dist
node_modules
.angular
src/app/shared/ui
```

- [ ] **Step 3: Scripts**

Em `package.json`, dentro de `"scripts"`, garanta:

```json
"start": "ng serve",
"build": "ng build",
"test": "ng test",
"lint": "ng lint",
"format": "prettier --write \"src/**/*.{ts,html,css}\" \"e2e/**/*.ts\"",
"format:check": "prettier --check \"src/**/*.{ts,html,css}\" \"e2e/**/*.ts\""
```

- [ ] **Step 4: Rodar lint e format**

Run: `npm run lint` e `npm run format`
Expected: lint sem erros (avisos aceitáveis nos arquivos gerados); format reescreve os arquivos.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: configurar eslint e prettier com plugin do tailwind"
```

---

### Task 4: Environments, `NotificacaoService`, `ErroApi` e `erroInterceptor`

**Files:**
- Create: `src/environments/environment.ts`, `src/environments/environment.development.ts`, `src/app/core/notificacao/notificacao.service.ts`, `src/app/core/notificacao/notificacao.service.spec.ts`, `src/app/core/http/erro-api.ts`, `src/app/core/http/erro.interceptor.ts`, `src/app/core/http/erro.interceptor.spec.ts`
- Modify: `angular.json` (fileReplacements, gerado por `ng g environments`)

**Interfaces:**
- Produces: `environment.apiUrl: string`; `NotificacaoService` com `sucesso(msg: string)`, `erro(msg: string)`, `info(msg: string)`; `interface ErroApi { status: number; titulo: string; detalhe: string; erros?: Record<string, string[]> }`; `ehErroApi(valor: unknown): valor is ErroApi`; `erroInterceptor: HttpInterceptorFn` que rejeita com `ErroApi` e notifica via toast os erros que não são de formulário (`400`, `401`, `422`).

- [ ] **Step 0: `NotificacaoService` (fina camada sobre o sonner)**

`src/app/core/notificacao/notificacao.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { toast } from '@spartan-ng/brain/sonner';
import { NotificacaoService } from './notificacao.service';

vi.mock('@spartan-ng/brain/sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

describe('NotificacaoService', () => {
  it('delega para o toast do sonner', () => {
    const servico = TestBed.inject(NotificacaoService);
    servico.sucesso('ok');
    servico.erro('falhou');
    servico.info('aviso');
    expect(toast.success).toHaveBeenCalledWith('ok');
    expect(toast.error).toHaveBeenCalledWith('falhou');
    expect(toast.info).toHaveBeenCalledWith('aviso');
  });
});
```

Run: `npm test -- --watch=false --include "**/notificacao.service.spec.ts"` → FAIL. Então `src/app/core/notificacao/notificacao.service.ts`:

```ts
import { Injectable } from '@angular/core';
import { toast } from '@spartan-ng/brain/sonner';

@Injectable({ providedIn: 'root' })
export class NotificacaoService {
  sucesso(mensagem: string): void {
    toast.success(mensagem);
  }

  erro(mensagem: string): void {
    toast.error(mensagem);
  }

  info(mensagem: string): void {
    toast.info(mensagem);
  }
}
```

Run de novo → 1 passando.

- [ ] **Step 1: Gerar os environments**

```bash
npx ng g environments
```

Edite `src/environments/environment.development.ts`:

```ts
export const environment = {
  producao: false,
  apiUrl: 'http://localhost:5130/tech-curse',
};
```

E `src/environments/environment.ts` (produção; URL definitiva fica fora do escopo):

```ts
export const environment = {
  producao: true,
  apiUrl: '/tech-curse',
};
```

- [ ] **Step 2: Tipo `ErroApi`**

`src/app/core/http/erro-api.ts`:

```ts
export interface ErroApi {
  status: number;
  titulo: string;
  detalhe: string;
  erros?: Record<string, string[]>;
}

export function ehErroApi(valor: unknown): valor is ErroApi {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    typeof (valor as ErroApi).status === 'number' &&
    typeof (valor as ErroApi).detalhe === 'string'
  );
}
```

- [ ] **Step 3: Teste do interceptor**

`src/app/core/http/erro.interceptor.spec.ts`:

```ts
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NotificacaoService } from '../notificacao/notificacao.service';
import { ErroApi } from './erro-api';
import { erroInterceptor } from './erro.interceptor';

describe('erroInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const notificacao = { sucesso: vi.fn(), erro: vi.fn(), info: vi.fn() };

  beforeEach(() => {
    notificacao.erro.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([erroInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificacaoService, useValue: notificacao },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  async function chamarEsperandoErro(): Promise<ErroApi> {
    return new Promise<ErroApi>((resolve) => {
      http.get('/api/x').subscribe({ error: (e) => resolve(e) });
    });
  }

  it('mapeia ProblemDetails 404', async () => {
    const promessa = chamarEsperandoErro();
    backend.expectOne('/api/x').flush(
      { status: 404, title: 'Não encontrado', detail: 'Curso não existe.' },
      { status: 404, statusText: 'Not Found' },
    );
    const erro = await promessa;
    expect(erro).toEqual({ status: 404, titulo: 'Não encontrado', detalhe: 'Curso não existe.' });
    expect(notificacao.erro).toHaveBeenCalledWith('Curso não existe.');
  });

  it('mapeia 422 com dicionário de erros', async () => {
    const promessa = chamarEsperandoErro();
    backend.expectOne('/api/x').flush(
      {
        status: 422,
        title: 'Erro de validação',
        detail: 'Ocorreram um ou mais erros de validação.',
        errors: { Password: ['A senha e a confirmação de senha não coincidem.'] },
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    const erro = await promessa;
    expect(erro.status).toBe(422);
    expect(erro.erros).toEqual({ Password: ['A senha e a confirmação de senha não coincidem.'] });
    expect(notificacao.erro).not.toHaveBeenCalled();
  });

  it('não notifica 400 nem 401 (erros tratados pelo formulário ou pelo refresh)', async () => {
    const p1 = chamarEsperandoErro();
    backend.expectOne('/api/x').flush({ title: 'Credenciais inválidas' }, { status: 400, statusText: 'Bad Request' });
    await p1;
    const p2 = chamarEsperandoErro();
    backend.expectOne('/api/x').flush({}, { status: 401, statusText: 'Unauthorized' });
    await p2;
    expect(notificacao.erro).not.toHaveBeenCalled();
  });

  it('usa mensagem genérica quando o corpo não é ProblemDetails', async () => {
    const promessa = chamarEsperandoErro();
    backend.expectOne('/api/x').flush('Internal Server Error', { status: 500, statusText: 'Server Error' });
    const erro = await promessa;
    expect(erro.status).toBe(500);
    expect(erro.titulo).toBe('Erro inesperado');
    expect(erro.detalhe).toBe('Ocorreu um erro inesperado. Tente novamente.');
  });

  it('trata status 0 como falha de conexão', async () => {
    const promessa = chamarEsperandoErro();
    backend.expectOne('/api/x').error(new ProgressEvent('error'), { status: 0 });
    const erro = await promessa;
    expect(erro.status).toBe(0);
    expect(erro.detalhe).toBe('Não foi possível conectar ao servidor.');
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npm test -- --watch=false --include "**/erro.interceptor.spec.ts"`
Expected: FAIL (`./erro.interceptor` não existe).

- [ ] **Step 5: Implementar**

`src/app/core/http/erro.interceptor.ts`:

```ts
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ErroApi } from './erro-api';

const TITULOS_POR_STATUS: Record<number, string> = {
  400: 'Requisição inválida',
  401: 'Não autenticado',
  403: 'Acesso negado',
  404: 'Não encontrado',
  409: 'Conflito',
  422: 'Erro de validação',
  429: 'Muitas requisições',
  504: 'Tempo esgotado',
};

interface ProblemDetails {
  status?: number;
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

function ehProblemDetails(corpo: unknown): corpo is ProblemDetails {
  return typeof corpo === 'object' && corpo !== null && ('title' in corpo || 'detail' in corpo);
}

export function converterErro(resposta: HttpErrorResponse): ErroApi {
  if (resposta.status === 0) {
    return { status: 0, titulo: 'Sem conexão', detalhe: 'Não foi possível conectar ao servidor.' };
  }
  const corpo = resposta.error;
  if (ehProblemDetails(corpo)) {
    return {
      status: resposta.status,
      titulo: corpo.title ?? TITULOS_POR_STATUS[resposta.status] ?? 'Erro inesperado',
      detalhe: corpo.detail ?? 'Ocorreu um erro inesperado. Tente novamente.',
      ...(corpo.errors ? { erros: corpo.errors } : {}),
    };
  }
  return {
    status: resposta.status,
    titulo: TITULOS_POR_STATUS[resposta.status] ?? 'Erro inesperado',
    detalhe: 'Ocorreu um erro inesperado. Tente novamente.',
  };
}

const STATUS_TRATADOS_LOCALMENTE = new Set([400, 401, 422]);

export const erroInterceptor: HttpInterceptorFn = (req, next) => {
  const notificacao = inject(NotificacaoService);
  return next(req).pipe(
    catchError((erro: unknown) => {
      if (!(erro instanceof HttpErrorResponse)) return throwError(() => erro);
      const erroApi = converterErro(erro);
      if (!STATUS_TRATADOS_LOCALMENTE.has(erroApi.status)) notificacao.erro(erroApi.detalhe);
      return throwError(() => erroApi);
    }),
  );
};
```

Ajuste os imports do arquivo para incluir `inject` de `@angular/core` e `NotificacaoService` de `../notificacao/notificacao.service`.

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test -- --watch=false --include "**/erro.interceptor.spec.ts"`
Expected: 5 testes passando.

- [ ] **Step 7: Commit**

```bash
git add src/environments src/app/core/http src/app/core/notificacao angular.json
git commit -m "feat: mapear ProblemDetails para ErroApi e notificar erros via toast"
```

---

### Task 5: Decodificação do JWT

**Files:**
- Create: `src/app/core/auth/jwt.ts`, `src/app/core/auth/jwt.spec.ts`

**Interfaces:**
- Produces: `type Role = 'Admin' | 'Instructor' | 'Student'`; `interface Usuario { id: string; email: string; role: Role }`; `decodificarPayload(token: string): Record<string, unknown> | null`; `extrairUsuario(token: string): Usuario | null`.

- [ ] **Step 1: Teste**

`src/app/core/auth/jwt.spec.ts`:

```ts
import { decodificarPayload, extrairUsuario } from './jwt';

function montarToken(payload: object): string {
  const b64 = (v: string) => btoa(v).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64('{"alg":"HS256"}')}.${b64(JSON.stringify(payload))}.assinatura`;
}

describe('jwt', () => {
  it('decodifica o payload em base64url', () => {
    const token = montarToken({ sub: '1', email: 'a@b.com' });
    expect(decodificarPayload(token)).toEqual({ sub: '1', email: 'a@b.com' });
  });

  it('retorna null para token malformado', () => {
    expect(decodificarPayload('abc')).toBeNull();
    expect(decodificarPayload('a.%%%.c')).toBeNull();
  });

  it('extrai usuário das claims curtas', () => {
    const token = montarToken({ nameid: '42', email: 'aluno@teste.dev', role: 'Student' });
    expect(extrairUsuario(token)).toEqual({ id: '42', email: 'aluno@teste.dev', role: 'Student' });
  });

  it('extrai usuário das claims longas e aceita role em array', () => {
    const token = montarToken({
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': '7',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'adm@teste.dev',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': ['Admin'],
    });
    expect(extrairUsuario(token)).toEqual({ id: '7', email: 'adm@teste.dev', role: 'Admin' });
  });

  it('retorna null quando a role é desconhecida', () => {
    const token = montarToken({ nameid: '1', email: 'x@y.z', role: 'Outra' });
    expect(extrairUsuario(token)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --watch=false --include "**/jwt.spec.ts"`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/app/core/auth/jwt.ts`:

```ts
export type Role = 'Admin' | 'Instructor' | 'Student';

export interface Usuario {
  id: string;
  email: string;
  role: Role;
}

const ROLES: Role[] = ['Admin', 'Instructor', 'Student'];

const CLAIM_ID = ['nameid', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier', 'sub'];
const CLAIM_EMAIL = ['email', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
const CLAIM_ROLE = ['role', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

export function decodificarPayload(token: string): Record<string, unknown> | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const preenchido = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(
      Array.from(atob(preenchido), (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
    );
    const payload = JSON.parse(json);
    return typeof payload === 'object' && payload !== null ? payload : null;
  } catch {
    return null;
  }
}

function primeiraClaim(payload: Record<string, unknown>, nomes: string[]): unknown {
  for (const nome of nomes) {
    if (payload[nome] !== undefined) return payload[nome];
  }
  return undefined;
}

export function extrairUsuario(token: string): Usuario | null {
  const payload = decodificarPayload(token);
  if (!payload) return null;
  const id = primeiraClaim(payload, CLAIM_ID);
  const email = primeiraClaim(payload, CLAIM_EMAIL);
  const roleBruta = primeiraClaim(payload, CLAIM_ROLE);
  const role = Array.isArray(roleBruta) ? roleBruta[0] : roleBruta;
  if (typeof id !== 'string' || typeof email !== 'string' || !ROLES.includes(role as Role)) {
    return null;
  }
  return { id, email, role: role as Role };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- --watch=false --include "**/jwt.spec.ts"`
Expected: 5 testes passando.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/auth/jwt.ts src/app/core/auth/jwt.spec.ts
git commit -m "feat: decodificar payload do jwt e extrair usuario com role"
```

---

### Task 6: `AutenticacaoService`

**Files:**
- Create: `src/app/core/auth/sessao.ts`, `src/app/core/auth/autenticacao.service.ts`, `src/app/core/auth/autenticacao.service.spec.ts`

**Interfaces:**
- Consumes: `extrairUsuario`, `Usuario`, `Role` (Task 5); `environment.apiUrl` (Task 4).
- Produces:
  - `interface Sessao { accessToken: string; refreshToken: string; expiresAt: string }`, `CHAVE_SESSAO = 'tech-curse.sessao'`, `lerSessao(): Sessao | null`, `gravarSessao(s: Sessao): void`, `limparSessao(): void`.
  - `AutenticacaoService`: `accessToken: Signal<string | null>`, `refreshToken: Signal<string | null>`, `usuario: Signal<Usuario | null>`, `role: Signal<Role | null>`, `estaAutenticado: Signal<boolean>`, `possuiRefreshToken: Signal<boolean>`, `entrar(email, senha): Promise<void>`, `registrar(dados: { nome; email; senha; confirmacaoSenha }): Promise<void>`, `renovar(): Promise<void>`, `sair(returnUrl?: string): void`.
  - `interface DadosRegistro { nome: string; email: string; senha: string; confirmacaoSenha: string }`.

- [ ] **Step 1: Persistência da sessão**

`src/app/core/auth/sessao.ts`:

```ts
export interface Sessao {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export const CHAVE_SESSAO = 'tech-curse.sessao';

export function lerSessao(): Sessao | null {
  try {
    const bruto = localStorage.getItem(CHAVE_SESSAO);
    if (!bruto) return null;
    const dados = JSON.parse(bruto);
    if (
      typeof dados?.accessToken === 'string' &&
      typeof dados?.refreshToken === 'string' &&
      typeof dados?.expiresAt === 'string'
    ) {
      return dados;
    }
    return null;
  } catch {
    return null;
  }
}

export function gravarSessao(sessao: Sessao): void {
  try {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  } catch {
    /* localStorage indisponível */
  }
}

export function limparSessao(): void {
  try {
    localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    /* localStorage indisponível */
  }
}
```

- [ ] **Step 2: Teste do service**

`src/app/core/auth/autenticacao.service.spec.ts`:

```ts
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AutenticacaoService } from './autenticacao.service';
import { CHAVE_SESSAO } from './sessao';

function montarToken(payload: object): string {
  const b64 = (v: string) => btoa(v).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64('{"alg":"HS256"}')}.${b64(JSON.stringify(payload))}.assinatura`;
}

const TOKEN_ALUNO = montarToken({ nameid: '1', email: 'aluno@teste.dev', role: 'Student' });
const FUTURO = new Date(Date.now() + 60_000).toISOString();
const PASSADO = new Date(Date.now() - 60_000).toISOString();

describe('AutenticacaoService', () => {
  let backend: HttpTestingController;

  function criar(): AutenticacaoService {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    backend = TestBed.inject(HttpTestingController);
    return TestBed.inject(AutenticacaoService);
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => backend.verify());

  it('começa sem sessão', () => {
    const servico = criar();
    expect(servico.estaAutenticado()).toBe(false);
    expect(servico.usuario()).toBeNull();
  });

  it('carrega a sessão gravada e expõe o usuário', () => {
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({ accessToken: TOKEN_ALUNO, refreshToken: 'r1', expiresAt: FUTURO }),
    );
    const servico = criar();
    expect(servico.estaAutenticado()).toBe(true);
    expect(servico.usuario()?.email).toBe('aluno@teste.dev');
    expect(servico.role()).toBe('Student');
  });

  it('considera sessão expirada como não autenticada, mas com refresh disponível', () => {
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({ accessToken: TOKEN_ALUNO, refreshToken: 'r1', expiresAt: PASSADO }),
    );
    const servico = criar();
    expect(servico.estaAutenticado()).toBe(false);
    expect(servico.possuiRefreshToken()).toBe(true);
  });

  it('entrar chama /Auth/login e persiste a sessão', async () => {
    const servico = criar();
    const promessa = servico.entrar('aluno@teste.dev', 'Senha@123');
    const req = backend.expectOne(`${environment.apiUrl}/Auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'aluno@teste.dev', password: 'Senha@123' });
    req.flush({ accessToken: TOKEN_ALUNO, refreshToken: 'r1', expiresAt: FUTURO });
    await promessa;
    expect(servico.estaAutenticado()).toBe(true);
    expect(JSON.parse(localStorage.getItem(CHAVE_SESSAO)!).refreshToken).toBe('r1');
  });

  it('registrar envia role Student', async () => {
    const servico = criar();
    const promessa = servico.registrar({
      nome: 'aluno',
      email: 'aluno@teste.dev',
      senha: 'Senha@123',
      confirmacaoSenha: 'Senha@123',
    });
    const req = backend.expectOne(`${environment.apiUrl}/Auth/register`);
    expect(req.request.body).toEqual({
      name: 'aluno',
      email: 'aluno@teste.dev',
      role: 'Student',
      password: 'Senha@123',
      confirmPassword: 'Senha@123',
    });
    req.flush({ mensagem: 'Usuário registrado com sucesso.' }, { status: 201, statusText: 'Created' });
    await promessa;
  });

  it('renovar concorrente dispara um único POST /Auth/refresh', async () => {
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({ accessToken: TOKEN_ALUNO, refreshToken: 'r1', expiresAt: PASSADO }),
    );
    const servico = criar();
    const p1 = servico.renovar();
    const p2 = servico.renovar();
    const req = backend.expectOne(`${environment.apiUrl}/Auth/refresh`);
    expect(req.request.body).toEqual({ accessToken: TOKEN_ALUNO, refreshToken: 'r1' });
    req.flush({ accessToken: TOKEN_ALUNO, refreshToken: 'r2', expiresAt: FUTURO });
    await Promise.all([p1, p2]);
    expect(servico.refreshToken()).toBe('r2');
    expect(servico.estaAutenticado()).toBe(true);
  });

  it('renovar rejeita quando não há sessão', async () => {
    const servico = criar();
    await expect(servico.renovar()).rejects.toThrow();
  });

  it('sair limpa a sessão e navega para /entrar com returnUrl', () => {
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({ accessToken: TOKEN_ALUNO, refreshToken: 'r1', expiresAt: FUTURO }),
    );
    const servico = criar();
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    servico.sair('/cursos');
    expect(servico.estaAutenticado()).toBe(false);
    expect(localStorage.getItem(CHAVE_SESSAO)).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/entrar'], { queryParams: { returnUrl: '/cursos' } });
  });

  it('propaga o erro HTTP de login', async () => {
    const servico = criar();
    const promessa = servico.entrar('x@y.z', 'errada');
    backend
      .expectOne(`${environment.apiUrl}/Auth/login`)
      .flush({ title: 'Credenciais inválidas' }, { status: 400, statusText: 'Bad Request' });
    await expect(promessa).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(servico.estaAutenticado()).toBe(false);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test -- --watch=false --include "**/autenticacao.service.spec.ts"`
Expected: FAIL.

- [ ] **Step 4: Implementar**

`src/app/core/auth/autenticacao.service.ts`:

```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Role, Usuario, extrairUsuario } from './jwt';
import { Sessao, gravarSessao, lerSessao, limparSessao } from './sessao';

export interface DadosRegistro {
  nome: string;
  email: string;
  senha: string;
  confirmacaoSenha: string;
}

interface AuthOutputDto {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

@Injectable({ providedIn: 'root' })
export class AutenticacaoService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sessao = signal<Sessao | null>(lerSessao());
  private renovacaoEmAndamento: Promise<void> | null = null;

  readonly accessToken = computed(() => this.sessao()?.accessToken ?? null);
  readonly refreshToken = computed(() => this.sessao()?.refreshToken ?? null);
  readonly usuario = computed<Usuario | null>(() => {
    const token = this.accessToken();
    return token ? extrairUsuario(token) : null;
  });
  readonly role = computed<Role | null>(() => this.usuario()?.role ?? null);
  readonly estaAutenticado = computed(() => {
    const sessao = this.sessao();
    return !!sessao && !!this.usuario() && new Date(sessao.expiresAt).getTime() > Date.now();
  });
  readonly possuiRefreshToken = computed(() => !!this.sessao()?.refreshToken);

  async entrar(email: string, senha: string): Promise<void> {
    const resposta = await firstValueFrom(
      this.http.post<AuthOutputDto>(`${environment.apiUrl}/Auth/login`, { email, password: senha }),
    );
    this.aplicarSessao(resposta);
  }

  async registrar(dados: DadosRegistro): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/Auth/register`, {
        name: dados.nome,
        email: dados.email,
        role: 'Student',
        password: dados.senha,
        confirmPassword: dados.confirmacaoSenha,
      }),
    );
  }

  renovar(): Promise<void> {
    if (this.renovacaoEmAndamento) return this.renovacaoEmAndamento;
    const sessao = this.sessao();
    if (!sessao) return Promise.reject(new Error('Não há sessão para renovar.'));
    this.renovacaoEmAndamento = firstValueFrom(
      this.http.post<AuthOutputDto>(`${environment.apiUrl}/Auth/refresh`, {
        accessToken: sessao.accessToken,
        refreshToken: sessao.refreshToken,
      }),
    )
      .then((resposta) => this.aplicarSessao(resposta))
      .finally(() => (this.renovacaoEmAndamento = null));
    return this.renovacaoEmAndamento;
  }

  sair(returnUrl?: string): void {
    this.sessao.set(null);
    limparSessao();
    const extras = returnUrl ? { queryParams: { returnUrl } } : {};
    void this.router.navigate(['/entrar'], extras);
  }

  private aplicarSessao(resposta: AuthOutputDto): void {
    const sessao: Sessao = {
      accessToken: resposta.accessToken,
      refreshToken: resposta.refreshToken,
      expiresAt: resposta.expiresAt,
    };
    this.sessao.set(sessao);
    gravarSessao(sessao);
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test -- --watch=false --include "**/autenticacao.service.spec.ts"`
Expected: 9 testes passando.

- [ ] **Step 6: Commit**

```bash
git add src/app/core/auth
git commit -m "feat: servico de autenticacao com sessao persistida e refresh com mutex"
```

---

### Task 7: `tokenInterceptor`

**Files:**
- Create: `src/app/core/auth/token.interceptor.ts`, `src/app/core/auth/token.interceptor.spec.ts`

**Interfaces:**
- Consumes: `AutenticacaoService` (`accessToken`, `renovar`, `sair`), `environment.apiUrl`.
- Produces: `tokenInterceptor: HttpInterceptorFn`.

- [ ] **Step 1: Teste**

`src/app/core/auth/token.interceptor.spec.ts`:

```ts
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AutenticacaoService } from './autenticacao.service';
import { tokenInterceptor } from './token.interceptor';

describe('tokenInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const token = signal<string | null>('t1');
  const auth = {
    accessToken: token,
    renovar: vi.fn<() => Promise<void>>(),
    sair: vi.fn(),
  };

  beforeEach(() => {
    token.set('t1');
    auth.renovar.mockReset();
    auth.sair.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tokenInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AutenticacaoService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('anexa Bearer só em chamadas para a API', () => {
    http.get(`${environment.apiUrl}/Course`).subscribe();
    http.get('https://outro.dev/x').subscribe();
    expect(backend.expectOne(`${environment.apiUrl}/Course`).request.headers.get('Authorization')).toBe('Bearer t1');
    expect(backend.expectOne('https://outro.dev/x').request.headers.has('Authorization')).toBe(false);
    backend.match(() => true).forEach((r) => r.flush({}));
  });

  it('não anexa header sem token', () => {
    token.set(null);
    http.get(`${environment.apiUrl}/Course`).subscribe();
    const req = backend.expectOne(`${environment.apiUrl}/Course`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('em 401 renova e repete uma vez com o novo token', async () => {
    auth.renovar.mockImplementation(async () => token.set('t2'));
    const resultado = new Promise((resolve) => http.get(`${environment.apiUrl}/Course`).subscribe(resolve));
    backend.expectOne(`${environment.apiUrl}/Course`).flush({}, { status: 401, statusText: 'Unauthorized' });
    await vi.waitFor(() => expect(backend.match(`${environment.apiUrl}/Course`).length).toBe(1));
    const repetida = backend.expectOne(`${environment.apiUrl}/Course`);
    expect(repetida.request.headers.get('Authorization')).toBe('Bearer t2');
    repetida.flush({ ok: true });
    expect(await resultado).toEqual({ ok: true });
    expect(auth.renovar).toHaveBeenCalledTimes(1);
  });

  it('se o refresh falha, chama sair e propaga o 401', async () => {
    auth.renovar.mockRejectedValue(new Error('refresh inválido'));
    const erro = new Promise<{ status: number }>((resolve) =>
      http.get(`${environment.apiUrl}/Course`).subscribe({ error: resolve }),
    );
    backend.expectOne(`${environment.apiUrl}/Course`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect((await erro).status).toBe(401);
    expect(auth.sair).toHaveBeenCalledTimes(1);
  });

  it('não tenta refresh em 401 de /Auth/login', async () => {
    const erro = new Promise<{ status: number }>((resolve) =>
      http.post(`${environment.apiUrl}/Auth/login`, {}).subscribe({ error: resolve }),
    );
    backend.expectOne(`${environment.apiUrl}/Auth/login`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect((await erro).status).toBe(401);
    expect(auth.renovar).not.toHaveBeenCalled();
    expect(auth.sair).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --watch=false --include "**/token.interceptor.spec.ts"`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/app/core/auth/token.interceptor.ts`:

```ts
import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AutenticacaoService } from './autenticacao.service';

const ROTAS_SEM_RETRY = /\/Auth\/(login|register|refresh)$/;

function comToken<T>(req: HttpRequest<T>, token: string | null): HttpRequest<T> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  const auth = inject(AutenticacaoService);
  const router = inject(Router);

  return next(comToken(req, auth.accessToken())).pipe(
    catchError((erro: unknown) => {
      const ehNaoAutorizado = erro instanceof HttpErrorResponse && erro.status === 401;
      if (!ehNaoAutorizado || ROTAS_SEM_RETRY.test(req.url)) return throwError(() => erro);

      return from(auth.renovar()).pipe(
        catchError(() => {
          auth.sair(router.url === '/' ? undefined : router.url);
          return throwError(() => erro);
        }),
        switchMap(() => next(comToken(req, auth.accessToken()))),
      );
    }),
  );
};
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- --watch=false --include "**/token.interceptor.spec.ts"`
Expected: 5 testes passando.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/auth/token.interceptor.ts src/app/core/auth/token.interceptor.spec.ts
git commit -m "feat: interceptor de token com renovacao unica em 401"
```

---

### Task 8: Guards e rota inicial por role

**Files:**
- Create: `src/app/core/auth/rota-inicial.ts`, `src/app/core/auth/rota-inicial.spec.ts`, `src/app/core/auth/autenticado.guard.ts`, `src/app/core/auth/role.guard.ts`, `src/app/core/auth/anonimo.guard.ts`, `src/app/core/auth/guards.spec.ts`

**Interfaces:**
- Consumes: `AutenticacaoService`, `Role`.
- Produces: `rotaInicialPorRole(role: Role | null): string`; `autenticadoGuard: CanActivateFn`; `roleGuard(roles: Role[]): CanMatchFn & CanActivateFn`; `anonimoGuard: CanActivateFn`.

- [ ] **Step 1: Teste da rota inicial**

`src/app/core/auth/rota-inicial.spec.ts`:

```ts
import { rotaInicialPorRole } from './rota-inicial';

describe('rotaInicialPorRole', () => {
  it('manda aluno para /cursos', () => expect(rotaInicialPorRole('Student')).toBe('/cursos'));
  it('manda admin e instrutor para /admin', () => {
    expect(rotaInicialPorRole('Admin')).toBe('/admin');
    expect(rotaInicialPorRole('Instructor')).toBe('/admin');
  });
  it('sem role cai em /cursos', () => expect(rotaInicialPorRole(null)).toBe('/cursos'));
});
```

- [ ] **Step 2: Implementar a rota inicial**

`src/app/core/auth/rota-inicial.ts`:

```ts
import { Role } from './jwt';

export function rotaInicialPorRole(role: Role | null): string {
  return role === 'Admin' || role === 'Instructor' ? '/admin' : '/cursos';
}
```

Run: `npm test -- --watch=false --include "**/rota-inicial.spec.ts"` → 3 passando.

- [ ] **Step 3: Teste dos guards**

`src/app/core/auth/guards.spec.ts`:

```ts
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { anonimoGuard } from './anonimo.guard';
import { autenticadoGuard } from './autenticado.guard';
import { AutenticacaoService } from './autenticacao.service';
import { Role } from './jwt';
import { roleGuard } from './role.guard';

describe('guards', () => {
  const estaAutenticado = signal(false);
  const possuiRefreshToken = signal(false);
  const role = signal<Role | null>(null);
  const auth = { estaAutenticado, possuiRefreshToken, role, renovar: vi.fn<() => Promise<void>>() };
  let router: Router;

  const snapshot = {} as ActivatedRouteSnapshot;
  const estado = (url: string) => ({ url }) as RouterStateSnapshot;

  beforeEach(() => {
    estaAutenticado.set(false);
    possuiRefreshToken.set(false);
    role.set(null);
    auth.renovar.mockReset();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AutenticacaoService, useValue: auth }],
    });
    router = TestBed.inject(Router);
  });

  const rodar = <T>(fn: () => T) => TestBed.runInInjectionContext(fn);

  describe('autenticadoGuard', () => {
    it('libera quando autenticado', async () => {
      estaAutenticado.set(true);
      expect(await rodar(() => autenticadoGuard(snapshot, estado('/cursos')))).toBe(true);
    });

    it('tenta renovar quando expirado com refresh disponível', async () => {
      possuiRefreshToken.set(true);
      auth.renovar.mockImplementation(async () => estaAutenticado.set(true));
      expect(await rodar(() => autenticadoGuard(snapshot, estado('/cursos')))).toBe(true);
      expect(auth.renovar).toHaveBeenCalledTimes(1);
    });

    it('redireciona para /entrar com returnUrl quando não autenticado', async () => {
      const resultado = (await rodar(() => autenticadoGuard(snapshot, estado('/cursos')))) as UrlTree;
      expect(router.serializeUrl(resultado)).toBe('/entrar?returnUrl=%2Fcursos');
    });
  });

  describe('roleGuard', () => {
    it('libera role permitida', () => {
      role.set('Admin');
      expect(rodar(() => roleGuard(['Admin', 'Instructor'])(snapshot, estado('/admin')))).toBe(true);
    });

    it('redireciona para /sem-permissao', () => {
      role.set('Student');
      const resultado = rodar(() => roleGuard(['Admin'])(snapshot, estado('/admin'))) as UrlTree;
      expect(router.serializeUrl(resultado)).toBe('/sem-permissao');
    });
  });

  describe('anonimoGuard', () => {
    it('libera quando não autenticado', () => {
      expect(rodar(() => anonimoGuard(snapshot, estado('/entrar')))).toBe(true);
    });

    it('redireciona para a rota inicial da role quando autenticado', () => {
      estaAutenticado.set(true);
      role.set('Admin');
      const resultado = rodar(() => anonimoGuard(snapshot, estado('/entrar'))) as UrlTree;
      expect(router.serializeUrl(resultado)).toBe('/admin');
    });
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npm test -- --watch=false --include "**/guards.spec.ts"`
Expected: FAIL.

- [ ] **Step 5: Implementar os guards**

`src/app/core/auth/autenticado.guard.ts`:

```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AutenticacaoService } from './autenticacao.service';

export const autenticadoGuard: CanActivateFn = async (_rota, estado) => {
  const auth = inject(AutenticacaoService);
  const router = inject(Router);

  if (auth.estaAutenticado()) return true;

  if (auth.possuiRefreshToken()) {
    try {
      await auth.renovar();
      if (auth.estaAutenticado()) return true;
    } catch {
      /* refresh inválido: cai no redirecionamento */
    }
  }

  return router.createUrlTree(['/entrar'], { queryParams: { returnUrl: estado.url } });
};
```

`src/app/core/auth/role.guard.ts`:

```ts
import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { AutenticacaoService } from './autenticacao.service';
import { Role } from './jwt';

export function roleGuard(roles: Role[]): CanActivateFn & CanMatchFn {
  return () => {
    const auth = inject(AutenticacaoService);
    const router = inject(Router);
    const atual = auth.role();
    return atual !== null && roles.includes(atual) ? true : router.createUrlTree(['/sem-permissao']);
  };
}
```

`src/app/core/auth/anonimo.guard.ts`:

```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AutenticacaoService } from './autenticacao.service';
import { rotaInicialPorRole } from './rota-inicial';

export const anonimoGuard: CanActivateFn = () => {
  const auth = inject(AutenticacaoService);
  const router = inject(Router);
  return auth.estaAutenticado() ? router.createUrlTree([rotaInicialPorRole(auth.role())]) : true;
};
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test -- --watch=false --include "**/guards.spec.ts"`
Expected: 7 testes passando.

- [ ] **Step 7: Commit**

```bash
git add src/app/core/auth
git commit -m "feat: guards de autenticacao, role e anonimo com rota inicial por role"
```

---

### Task 9: Configuração da aplicação (interceptors, toaster, tema)

**Files:**
- Modify: `src/app/app.config.ts`, `src/app/app.ts`, `src/app/app.html`

**Interfaces:**
- Consumes: `erroInterceptor` (Task 4), `tokenInterceptor` (Task 7), `TemaService` (Task 2), `HlmToasterImports`.
- Produces: `appConfig` com router e `HttpClient` + `[erroInterceptor, tokenInterceptor]`; `<hlm-toaster>` montado na raiz.

- [ ] **Step 1: Configurar a aplicação**

`src/app/app.config.ts`:

```ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { tokenInterceptor } from './core/auth/token.interceptor';
import { erroInterceptor } from './core/http/erro.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([erroInterceptor, tokenInterceptor])),
  ],
};
```

A ordem importa: `erroInterceptor` vem primeiro na lista, então na **resposta** o `tokenInterceptor` vê o `HttpErrorResponse` cru (e decide o refresh) antes de o `erroInterceptor` convertê-lo em `ErroApi`. Se o `app.config.ts` gerado tiver outros providers (ex.: `provideZonelessChangeDetection()`), mantenha-os.

`src/app/app.ts`:

```ts
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { TemaService } from './core/tema/tema.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HlmToasterImports],
  templateUrl: './app.html',
})
export class App {
  private readonly tema = inject(TemaService);
}
```

`src/app/app.html`:

```html
<router-outlet />
<hlm-toaster position="top-right" [richColors]="true" />
```

- [ ] **Step 2: Build e testes completos**

Run: `npx ng build` e `npm test -- --watch=false`
Expected: build ok; todos os testes passando (a injeção do `TemaService` na raiz aplica a classe `dark` no carregamento).

- [ ] **Step 3: Commit**

```bash
git add src/app
git commit -m "feat: registrar interceptors, toaster e tema na raiz da aplicacao"
```

---

### Task 10: Layouts, páginas de erro, placeholders e rotas

**Files:**
- Create: `src/app/core/layout/shell/shell.ts`, `shell.html`, `shell.spec.ts`; `src/app/core/layout/publico/publico.ts`, `publico.html`; `src/app/features/erros/sem-permissao/sem-permissao.ts`, `nao-encontrado/nao-encontrado.ts`; `src/app/features/admin/painel/painel.ts`, `src/app/features/admin/admin.routes.ts`; `src/app/features/aluno/aluno.routes.ts`; `src/app/features/auth/auth.routes.ts` (rotas vazias por enquanto); `src/app/features/catalogo/catalogo.routes.ts` (rota vazia por enquanto)
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Consumes: `AutenticacaoService`, `TemaService`, guards (Task 8).
- Produces: `ShellComponent`, `PublicoLayoutComponent`, rotas raiz. Tasks 11–13 preenchem `auth.routes.ts` e `catalogo.routes.ts`.

- [ ] **Step 1: Teste do shell**

`src/app/core/layout/shell/shell.spec.ts`:

```ts
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AutenticacaoService } from '../../auth/autenticacao.service';
import { Role, Usuario } from '../../auth/jwt';
import { ShellComponent } from './shell';

describe('ShellComponent', () => {
  const usuario = signal<Usuario | null>({ id: '1', email: 'aluno@teste.dev', role: 'Student' });
  const role = signal<Role | null>('Student');
  const auth = { usuario, role, sair: vi.fn() };

  beforeEach(async () => {
    auth.sair.mockReset();
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [provideRouter([]), { provide: AutenticacaoService, useValue: auth }],
    }).compileComponents();
  });

  it('mostra o e-mail e esconde o link de admin para aluno', async () => {
    const fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
    const html: HTMLElement = fixture.nativeElement;
    expect(html.textContent).toContain('aluno@teste.dev');
    expect(html.querySelector('a[href="/admin"]')).toBeNull();
    expect(html.querySelector('a[href="/cursos"]')).not.toBeNull();
  });

  it('mostra o link de admin para Admin', async () => {
    role.set('Admin');
    const fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/admin"]')).not.toBeNull();
  });

  it('botão Sair chama sair()', async () => {
    const fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[data-teste="sair"]')!.click();
    expect(auth.sair).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --watch=false --include "**/shell.spec.ts"`
Expected: FAIL.

- [ ] **Step 3: Implementar o shell**

`src/app/core/layout/shell/shell.ts`:

```ts
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { AutenticacaoService } from '../../auth/autenticacao.service';
import { TemaService } from '../../tema/tema.service';

interface LinkNavegacao {
  rota: string;
  rotulo: string;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, HlmButtonImports],
  templateUrl: './shell.html',
})
export class ShellComponent {
  private readonly auth = inject(AutenticacaoService);
  protected readonly tema = inject(TemaService);

  protected readonly usuario = this.auth.usuario;
  protected readonly menuAberto = signal(false);

  protected readonly links = computed<LinkNavegacao[]>(() => {
    const role = this.auth.role();
    const base: LinkNavegacao[] = [{ rota: '/cursos', rotulo: 'Cursos' }];
    if (role === 'Admin' || role === 'Instructor') base.push({ rota: '/admin', rotulo: 'Admin' });
    return base;
  });

  protected alternarMenu(): void {
    this.menuAberto.update((aberto) => !aberto);
  }

  protected sair(): void {
    this.auth.sair();
  }
}
```

`src/app/core/layout/shell/shell.html`:

```html
<div class="bg-background text-foreground flex min-h-screen flex-col">
  <header class="border-border bg-card border-b">
    <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
      <a routerLink="/" class="text-lg font-semibold">Tech Curse</a>

      <nav class="hidden items-center gap-2 md:flex" aria-label="Principal">
        @for (link of links(); track link.rota) {
          <a
            hlmBtn
            variant="ghost"
            [routerLink]="link.rota"
            routerLinkActive="bg-accent"
            >{{ link.rotulo }}</a
          >
        }
      </nav>

      <div class="flex items-center gap-2">
        <button hlmBtn variant="ghost" size="icon" type="button" (click)="tema.alternar()" aria-label="Alternar tema">
          {{ tema.escuro() ? '☀' : '☾' }}
        </button>
        <span class="text-muted-foreground hidden text-sm md:inline">{{ usuario()?.email }}</span>
        <button hlmBtn variant="outline" size="sm" type="button" data-teste="sair" (click)="sair()">Sair</button>
        <button
          hlmBtn
          variant="ghost"
          size="icon"
          type="button"
          class="md:hidden"
          aria-label="Abrir menu"
          [attr.aria-expanded]="menuAberto()"
          (click)="alternarMenu()"
        >
          ☰
        </button>
      </div>
    </div>

    @if (menuAberto()) {
      <nav class="border-border flex flex-col gap-1 border-t px-4 py-2 md:hidden" aria-label="Principal (mobile)">
        <span class="text-muted-foreground px-2 py-1 text-sm">{{ usuario()?.email }}</span>
        @for (link of links(); track link.rota) {
          <a hlmBtn variant="ghost" class="justify-start" [routerLink]="link.rota" (click)="alternarMenu()">
            {{ link.rotulo }}
          </a>
        }
      </nav>
    }
  </header>

  <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
    <router-outlet />
  </main>
</div>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- --watch=false --include "**/shell.spec.ts"`
Expected: 3 testes passando.

- [ ] **Step 5: Layout público**

`src/app/core/layout/publico/publico.ts`:

```ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-publico-layout',
  imports: [RouterOutlet],
  templateUrl: './publico.html',
})
export class PublicoLayoutComponent {}
```

`src/app/core/layout/publico/publico.html`:

```html
<div class="bg-background text-foreground flex min-h-screen items-center justify-center p-4">
  <div class="w-full max-w-md">
    <h1 class="mb-6 text-center text-2xl font-semibold">Tech Curse</h1>
    <router-outlet />
  </div>
</div>
```

- [ ] **Step 6: Páginas de erro e placeholders**

`src/app/features/erros/sem-permissao/sem-permissao.ts`:

```ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-sem-permissao',
  imports: [RouterLink, HlmButtonImports],
  template: `
    <section class="flex flex-col items-center gap-4 py-16 text-center">
      <h1 class="text-3xl font-semibold">Sem permissão</h1>
      <p class="text-muted-foreground">Você não tem acesso a esta página.</p>
      <a hlmBtn routerLink="/">Voltar ao início</a>
    </section>
  `,
})
export class SemPermissaoComponent {}
```

`src/app/features/erros/nao-encontrado/nao-encontrado.ts`:

```ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-nao-encontrado',
  imports: [RouterLink, HlmButtonImports],
  template: `
    <section class="flex flex-col items-center gap-4 py-16 text-center">
      <h1 class="text-3xl font-semibold">Página não encontrada</h1>
      <p class="text-muted-foreground">O endereço acessado não existe.</p>
      <a hlmBtn routerLink="/">Voltar ao início</a>
    </section>
  `,
})
export class NaoEncontradoComponent {}
```

`src/app/features/admin/painel/painel.ts`:

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-painel-admin',
  template: `
    <h1 class="text-2xl font-semibold">Painel administrativo</h1>
    <p class="text-muted-foreground mt-2">Em breve.</p>
  `,
})
export class PainelAdminComponent {}
```

`src/app/features/admin/admin.routes.ts`:

```ts
import { Routes } from '@angular/router';
import { PainelAdminComponent } from './painel/painel';

export const ADMIN_ROUTES: Routes = [{ path: '', component: PainelAdminComponent }];
```

`src/app/features/aluno/aluno.routes.ts`:

```ts
import { Routes } from '@angular/router';

export const ALUNO_ROUTES: Routes = [{ path: '', redirectTo: '/cursos', pathMatch: 'full' }];
```

`src/app/features/auth/auth.routes.ts` (preenchido nas Tasks 11 e 12):

```ts
import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [];
```

`src/app/features/catalogo/catalogo.routes.ts` (preenchido na Task 13):

```ts
import { Routes } from '@angular/router';

export const CATALOGO_ROUTES: Routes = [];
```

- [ ] **Step 7: Rotas raiz**

`src/app/app.routes.ts`:

```ts
import { Routes } from '@angular/router';
import { anonimoGuard } from './core/auth/anonimo.guard';
import { autenticadoGuard } from './core/auth/autenticado.guard';
import { roleGuard } from './core/auth/role.guard';
import { PublicoLayoutComponent } from './core/layout/publico/publico';
import { ShellComponent } from './core/layout/shell/shell';
import { NaoEncontradoComponent } from './features/erros/nao-encontrado/nao-encontrado';
import { SemPermissaoComponent } from './features/erros/sem-permissao/sem-permissao';

export const routes: Routes = [
  {
    path: '',
    component: PublicoLayoutComponent,
    canActivate: [anonimoGuard],
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [autenticadoGuard],
    children: [
      { path: '', redirectTo: 'cursos', pathMatch: 'full' },
      {
        path: 'cursos',
        loadChildren: () => import('./features/catalogo/catalogo.routes').then((m) => m.CATALOGO_ROUTES),
      },
      {
        path: 'aluno',
        canMatch: [roleGuard(['Student'])],
        loadChildren: () => import('./features/aluno/aluno.routes').then((m) => m.ALUNO_ROUTES),
      },
      {
        path: 'admin',
        canMatch: [roleGuard(['Admin', 'Instructor'])],
        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
      { path: 'sem-permissao', component: SemPermissaoComponent },
    ],
  },
  { path: '**', component: NaoEncontradoComponent },
];
```

Observação: o primeiro bloco (`PublicoLayoutComponent`) só casa quando `AUTH_ROUTES` contém a URL (`entrar`, `registrar`); como está vazio até a Task 11, tudo cai no shell — esperado. `canMatch` com `UrlTree` faz o router redirecionar; se um `canMatch` retornar `UrlTree` for ignorado na sua versão do Angular (comportamento antigo era "pular a rota"), troque para `canActivate` nas duas rotas.

- [ ] **Step 8: Build**

Run: `npx ng build` e `npm test -- --watch=false`
Expected: sem erros; todos os testes verdes.

- [ ] **Step 9: Commit**

```bash
git add src/app
git commit -m "feat: shell com navegacao por role, layout publico, paginas de erro e rotas"
```

---

### Task 11: Tela de login (`/entrar`)

**Files:**
- Create: `src/app/features/auth/entrar/entrar.ts`, `entrar.html`, `entrar.spec.ts`
- Modify: `src/app/features/auth/auth.routes.ts`

**Interfaces:**
- Consumes: `AutenticacaoService.entrar`, `rotaInicialPorRole`, `ehErroApi`, `NotificacaoService`.
- Produces: `EntrarComponent` na rota `entrar`.

- [ ] **Step 1: Teste**

`src/app/features/auth/entrar/entrar.spec.ts`:

```ts
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AutenticacaoService } from '../../../core/auth/autenticacao.service';
import { Role } from '../../../core/auth/jwt';
import { ErroApi } from '../../../core/http/erro-api';
import { EntrarComponent } from './entrar';

describe('EntrarComponent', () => {
  const role = signal<Role | null>('Student');
  const auth = { entrar: vi.fn<(e: string, s: string) => Promise<void>>(), role };
  let fixture: ComponentFixture<EntrarComponent>;
  let router: Router;
  let queryParams: Record<string, string>;

  async function montar(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [EntrarComponent],
      providers: [
        provideRouter([]),
        { provide: AutenticacaoService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(EntrarComponent);
    await fixture.whenStable();
  }

  function preencher(email: string, senha: string): void {
    const el: HTMLElement = fixture.nativeElement;
    const campoEmail = el.querySelector<HTMLInputElement>('input[formControlName="email"]')!;
    const campoSenha = el.querySelector<HTMLInputElement>('input[formControlName="senha"]')!;
    campoEmail.value = email;
    campoEmail.dispatchEvent(new Event('input'));
    campoSenha.value = senha;
    campoSenha.dispatchEvent(new Event('input'));
  }

  async function enviar(): Promise<void> {
    (fixture.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  beforeEach(() => {
    auth.entrar.mockReset();
    role.set('Student');
    queryParams = {};
  });

  it('não envia com formulário inválido', async () => {
    await montar();
    preencher('nao-e-email', '');
    await enviar();
    expect(auth.entrar).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Informe um e-mail válido');
  });

  it('entra e navega para a rota inicial da role', async () => {
    auth.entrar.mockResolvedValue();
    await montar();
    preencher('aluno@teste.dev', 'Senha@123');
    await enviar();
    expect(auth.entrar).toHaveBeenCalledWith('aluno@teste.dev', 'Senha@123');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/cursos');
  });

  it('respeita returnUrl', async () => {
    auth.entrar.mockResolvedValue();
    queryParams = { returnUrl: '/cursos?pagina=2' };
    await montar();
    preencher('aluno@teste.dev', 'Senha@123');
    await enviar();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/cursos?pagina=2');
  });

  it('mostra o detalhe do erro da API', async () => {
    const erro: ErroApi = { status: 400, titulo: 'Credenciais inválidas', detalhe: 'E-mail ou senha incorretos.' };
    auth.entrar.mockRejectedValue(erro);
    await montar();
    preencher('aluno@teste.dev', 'errada');
    await enviar();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('E-mail ou senha incorretos.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --watch=false --include "**/entrar.spec.ts"`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/app/features/auth/entrar/entrar.ts`:

```ts
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { AutenticacaoService } from '../../../core/auth/autenticacao.service';
import { rotaInicialPorRole } from '../../../core/auth/rota-inicial';
import { ehErroApi } from '../../../core/http/erro-api';

@Component({
  selector: 'app-entrar',
  imports: [ReactiveFormsModule, RouterLink, HlmButtonImports, HlmCardImports, HlmInputImports, HlmLabelImports],
  templateUrl: './entrar.html',
})
export class EntrarComponent {
  private readonly auth = inject(AutenticacaoService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);

  protected readonly formulario = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    senha: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected async enviar(): Promise<void> {
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid || this.enviando()) return;

    this.enviando.set(true);
    this.erro.set(null);
    const { email, senha } = this.formulario.getRawValue();
    try {
      await this.auth.entrar(email, senha);
      const returnUrl = this.rota.snapshot.queryParamMap.get('returnUrl');
      await this.router.navigateByUrl(returnUrl || rotaInicialPorRole(this.auth.role()));
    } catch (e) {
      this.erro.set(ehErroApi(e) ? e.detalhe : 'Não foi possível entrar. Tente novamente.');
    } finally {
      this.enviando.set(false);
    }
  }

  protected campoInvalido(nome: 'email' | 'senha'): boolean {
    const controle = this.formulario.controls[nome];
    return controle.invalid && controle.touched;
  }
}
```

`src/app/features/auth/entrar/entrar.html`:

```html
<section hlmCard>
  <div hlmCardHeader>
    <h2 hlmCardTitle>Entrar</h2>
    <p hlmCardDescription>Acesse sua conta para ver os cursos.</p>
  </div>
  <div hlmCardContent>
    <form [formGroup]="formulario" (ngSubmit)="enviar()" novalidate class="flex flex-col gap-4">
      <div class="flex flex-col gap-1.5">
        <label hlmLabel for="email">E-mail</label>
        <input hlmInput id="email" type="email" formControlName="email" autocomplete="email" />
        @if (campoInvalido('email')) {
          <p class="text-destructive text-sm">Informe um e-mail válido.</p>
        }
      </div>

      <div class="flex flex-col gap-1.5">
        <label hlmLabel for="senha">Senha</label>
        <input hlmInput id="senha" type="password" formControlName="senha" autocomplete="current-password" />
        @if (campoInvalido('senha')) {
          <p class="text-destructive text-sm">Informe a senha.</p>
        }
      </div>

      @if (erro(); as mensagem) {
        <p class="text-destructive text-sm" role="alert">{{ mensagem }}</p>
      }

      <button hlmBtn type="submit" [disabled]="enviando()">
        {{ enviando() ? 'Entrando...' : 'Entrar' }}
      </button>
    </form>
  </div>
  <div hlmCardFooter class="justify-center">
    <p class="text-muted-foreground text-sm">
      Não tem conta? <a routerLink="/registrar" class="text-primary underline">Registre-se</a>
    </p>
  </div>
</section>
```

`src/app/features/auth/auth.routes.ts`:

```ts
import { Routes } from '@angular/router';
import { EntrarComponent } from './entrar/entrar';

export const AUTH_ROUTES: Routes = [{ path: 'entrar', component: EntrarComponent }];
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- --watch=false --include "**/entrar.spec.ts"`
Expected: 4 testes passando. Se o teste de "formulário inválido" não encontrar a mensagem, o `markAllAsTouched` precisa de um `fixture.detectChanges()` extra após `enviar()` — adicione `fixture.detectChanges()` dentro de `enviar()` no spec, depois do `whenStable()`.

- [ ] **Step 5: Verificação manual**

Run: `npm start` e abra http://localhost:4200/entrar (com a API rodando via `docker-compose up -d` em `../tech-curse`). Expected: cartão de login renderizado com o tema; senha errada mostra a mensagem da API.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/auth
git commit -m "feat: tela de login com redirecionamento por role e returnUrl"
```

---

### Task 12: Tela de registro (`/registrar`)

**Files:**
- Create: `src/app/features/auth/validadores.ts`, `validadores.spec.ts`, `src/app/features/auth/registrar/registrar.ts`, `registrar.html`, `registrar.spec.ts`
- Modify: `src/app/features/auth/auth.routes.ts`

**Interfaces:**
- Consumes: `AutenticacaoService.registrar`, `NotificacaoService`, `ehErroApi`.
- Produces: `senhaForteValidator`, `nomeUsuarioValidator`, `senhasIguaisValidator`; `RegistrarComponent` na rota `registrar`.

- [ ] **Step 1: Teste dos validadores**

`src/app/features/auth/validadores.spec.ts`:

```ts
import { FormControl, FormGroup } from '@angular/forms';
import { nomeUsuarioValidator, senhaForteValidator, senhasIguaisValidator } from './validadores';

describe('validadores', () => {
  it('senhaForte exige 8+ chars, dígito, maiúscula, minúscula e símbolo', () => {
    expect(senhaForteValidator(new FormControl('Senha@123'))).toBeNull();
    expect(senhaForteValidator(new FormControl('senha@123'))).toEqual({ senhaForte: true });
    expect(senhaForteValidator(new FormControl('Senha123'))).toEqual({ senhaForte: true });
    expect(senhaForteValidator(new FormControl('Se@1'))).toEqual({ senhaForte: true });
  });

  it('nomeUsuario aceita só letras, números e -._@+', () => {
    expect(nomeUsuarioValidator(new FormControl('joao.silva'))).toBeNull();
    expect(nomeUsuarioValidator(new FormControl('joao silva'))).toEqual({ nomeUsuario: true });
  });

  it('senhasIguais compara senha e confirmação', () => {
    const grupo = new FormGroup(
      { senha: new FormControl('a'), confirmacaoSenha: new FormControl('b') },
      { validators: [senhasIguaisValidator] },
    );
    expect(grupo.errors).toEqual({ senhasDiferentes: true });
    grupo.controls.confirmacaoSenha.setValue('a');
    expect(grupo.errors).toBeNull();
  });
});
```

- [ ] **Step 2: Implementar os validadores**

`src/app/features/auth/validadores.ts`:

```ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const SENHA_FORTE = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
const NOME_USUARIO = /^[A-Za-z0-9\-._@+]+$/;

export const senhaForteValidator: ValidatorFn = (controle: AbstractControl): ValidationErrors | null => {
  const valor = controle.value as string;
  return !valor || SENHA_FORTE.test(valor) ? null : { senhaForte: true };
};

export const nomeUsuarioValidator: ValidatorFn = (controle: AbstractControl): ValidationErrors | null => {
  const valor = controle.value as string;
  return !valor || NOME_USUARIO.test(valor) ? null : { nomeUsuario: true };
};

export const senhasIguaisValidator: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
  const senha = grupo.get('senha')?.value;
  const confirmacao = grupo.get('confirmacaoSenha')?.value;
  return senha === confirmacao ? null : { senhasDiferentes: true };
};
```

Run: `npm test -- --watch=false --include "**/validadores.spec.ts"` → 3 passando.

- [ ] **Step 3: Teste do componente**

`src/app/features/auth/registrar/registrar.spec.ts`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AutenticacaoService, DadosRegistro } from '../../../core/auth/autenticacao.service';
import { ErroApi } from '../../../core/http/erro-api';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { RegistrarComponent } from './registrar';

describe('RegistrarComponent', () => {
  const auth = { registrar: vi.fn<(d: DadosRegistro) => Promise<void>>() };
  const notificacao = { sucesso: vi.fn(), erro: vi.fn(), info: vi.fn() };
  let fixture: ComponentFixture<RegistrarComponent>;
  let router: Router;

  beforeEach(async () => {
    auth.registrar.mockReset();
    notificacao.sucesso.mockReset();
    await TestBed.configureTestingModule({
      imports: [RegistrarComponent],
      providers: [
        provideRouter([]),
        { provide: AutenticacaoService, useValue: auth },
        { provide: NotificacaoService, useValue: notificacao },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(RegistrarComponent);
    await fixture.whenStable();
  });

  function preencher(valores: Record<string, string>): void {
    const el: HTMLElement = fixture.nativeElement;
    for (const [nome, valor] of Object.entries(valores)) {
      const campo = el.querySelector<HTMLInputElement>(`input[formControlName="${nome}"]`)!;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
    }
  }

  async function enviar(): Promise<void> {
    (fixture.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const dadosValidos = { nome: 'aluno', email: 'aluno@teste.dev', senha: 'Senha@123', confirmacaoSenha: 'Senha@123' };

  it('bloqueia senhas diferentes', async () => {
    preencher({ ...dadosValidos, confirmacaoSenha: 'Outra@123' });
    await enviar();
    expect(auth.registrar).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('As senhas não coincidem');
  });

  it('registra, notifica e vai para /entrar', async () => {
    auth.registrar.mockResolvedValue();
    preencher(dadosValidos);
    await enviar();
    expect(auth.registrar).toHaveBeenCalledWith(dadosValidos);
    expect(notificacao.sucesso).toHaveBeenCalledWith('Conta criada. Entre para continuar.');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/entrar');
  });

  it('distribui erros 422 nos campos', async () => {
    const erro: ErroApi = {
      status: 422,
      titulo: 'Erro de validação',
      detalhe: 'Ocorreram um ou mais erros de validação.',
      erros: {
        DuplicateEmail: ["O e-mail 'aluno@teste.dev' já está em uso."],
        PasswordRequiresDigit: ['A senha precisa de um dígito.'],
      },
    };
    auth.registrar.mockRejectedValue(erro);
    preencher(dadosValidos);
    await enviar();
    const texto = (fixture.nativeElement as HTMLElement).textContent;
    expect(texto).toContain("O e-mail 'aluno@teste.dev' já está em uso.");
    expect(texto).toContain('A senha precisa de um dígito.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npm test -- --watch=false --include "**/registrar.spec.ts"`
Expected: FAIL.

- [ ] **Step 5: Implementar**

`src/app/features/auth/registrar/registrar.ts`:

```ts
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { AutenticacaoService } from '../../../core/auth/autenticacao.service';
import { ehErroApi } from '../../../core/http/erro-api';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { nomeUsuarioValidator, senhaForteValidator, senhasIguaisValidator } from '../validadores';

type Campo = 'nome' | 'email' | 'senha' | 'confirmacaoSenha';

const CAMPO_POR_CODIGO_IDENTITY: Record<string, Campo> = {
  DuplicateUserName: 'nome',
  InvalidUserName: 'nome',
  DuplicateEmail: 'email',
  InvalidEmail: 'email',
};

function campoDoCodigo(codigo: string): Campo | null {
  if (codigo.startsWith('Password')) return 'senha';
  return CAMPO_POR_CODIGO_IDENTITY[codigo] ?? null;
}

@Component({
  selector: 'app-registrar',
  imports: [ReactiveFormsModule, RouterLink, HlmButtonImports, HlmCardImports, HlmInputImports, HlmLabelImports],
  templateUrl: './registrar.html',
})
export class RegistrarComponent {
  private readonly auth = inject(AutenticacaoService);
  private readonly notificacao = inject(NotificacaoService);
  private readonly router = inject(Router);

  protected readonly formulario = new FormGroup(
    {
      nome: new FormControl('', { nonNullable: true, validators: [Validators.required, nomeUsuarioValidator] }),
      email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
      senha: new FormControl('', { nonNullable: true, validators: [Validators.required, senhaForteValidator] }),
      confirmacaoSenha: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: [senhasIguaisValidator] },
  );

  protected readonly enviando = signal(false);
  protected readonly erroGeral = signal<string | null>(null);
  protected readonly errosApi = signal<Partial<Record<Campo, string>>>({});

  protected async enviar(): Promise<void> {
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid || this.enviando()) return;

    this.enviando.set(true);
    this.erroGeral.set(null);
    this.errosApi.set({});
    try {
      await this.auth.registrar(this.formulario.getRawValue());
      this.notificacao.sucesso('Conta criada. Entre para continuar.');
      await this.router.navigateByUrl('/entrar');
    } catch (e) {
      this.tratarErro(e);
    } finally {
      this.enviando.set(false);
    }
  }

  protected mensagemDe(campo: Campo): string | null {
    const daApi = this.errosApi()[campo];
    if (daApi) return daApi;
    const controle = this.formulario.controls[campo];
    if (!controle.touched) return null;
    if (controle.hasError('required')) return 'Campo obrigatório.';
    if (controle.hasError('email')) return 'Informe um e-mail válido.';
    if (controle.hasError('nomeUsuario')) return 'Use apenas letras, números e os símbolos - . _ @ + (sem espaços).';
    if (controle.hasError('senhaForte')) {
      return 'Mínimo de 8 caracteres com maiúscula, minúscula, número e símbolo.';
    }
    if (campo === 'confirmacaoSenha' && this.formulario.hasError('senhasDiferentes')) {
      return 'As senhas não coincidem.';
    }
    return null;
  }

  private tratarErro(e: unknown): void {
    if (!ehErroApi(e)) {
      this.erroGeral.set('Não foi possível criar a conta. Tente novamente.');
      return;
    }
    if (e.status !== 422 || !e.erros) {
      this.erroGeral.set(e.detalhe);
      return;
    }
    const porCampo: Partial<Record<Campo, string>> = {};
    const gerais: string[] = [];
    for (const [codigo, mensagens] of Object.entries(e.erros)) {
      const campo = campoDoCodigo(codigo);
      if (campo) porCampo[campo] = [porCampo[campo], ...mensagens].filter(Boolean).join(' ');
      else gerais.push(...mensagens);
    }
    this.errosApi.set(porCampo);
    if (gerais.length) this.erroGeral.set(gerais.join(' '));
  }
}
```

`src/app/features/auth/registrar/registrar.html`:

```html
<section hlmCard>
  <div hlmCardHeader>
    <h2 hlmCardTitle>Criar conta</h2>
    <p hlmCardDescription>Cadastre-se como aluno para acessar o catálogo.</p>
  </div>
  <div hlmCardContent>
    <form [formGroup]="formulario" (ngSubmit)="enviar()" novalidate class="flex flex-col gap-4">
      <div class="flex flex-col gap-1.5">
        <label hlmLabel for="nome">Nome de usuário</label>
        <input hlmInput id="nome" type="text" formControlName="nome" autocomplete="username" />
        @if (mensagemDe('nome'); as msg) {
          <p class="text-destructive text-sm">{{ msg }}</p>
        }
      </div>

      <div class="flex flex-col gap-1.5">
        <label hlmLabel for="email">E-mail</label>
        <input hlmInput id="email" type="email" formControlName="email" autocomplete="email" />
        @if (mensagemDe('email'); as msg) {
          <p class="text-destructive text-sm">{{ msg }}</p>
        }
      </div>

      <div class="flex flex-col gap-1.5">
        <label hlmLabel for="senha">Senha</label>
        <input hlmInput id="senha" type="password" formControlName="senha" autocomplete="new-password" />
        @if (mensagemDe('senha'); as msg) {
          <p class="text-destructive text-sm">{{ msg }}</p>
        }
      </div>

      <div class="flex flex-col gap-1.5">
        <label hlmLabel for="confirmacaoSenha">Confirmar senha</label>
        <input
          hlmInput
          id="confirmacaoSenha"
          type="password"
          formControlName="confirmacaoSenha"
          autocomplete="new-password"
        />
        @if (mensagemDe('confirmacaoSenha'); as msg) {
          <p class="text-destructive text-sm">{{ msg }}</p>
        }
      </div>

      @if (erroGeral(); as mensagem) {
        <p class="text-destructive text-sm" role="alert">{{ mensagem }}</p>
      }

      <button hlmBtn type="submit" [disabled]="enviando()">
        {{ enviando() ? 'Criando...' : 'Criar conta' }}
      </button>
    </form>
  </div>
  <div hlmCardFooter class="justify-center">
    <p class="text-muted-foreground text-sm">
      Já tem conta? <a routerLink="/entrar" class="text-primary underline">Entrar</a>
    </p>
  </div>
</section>
```

`src/app/features/auth/auth.routes.ts`:

```ts
import { Routes } from '@angular/router';
import { EntrarComponent } from './entrar/entrar';
import { RegistrarComponent } from './registrar/registrar';

export const AUTH_ROUTES: Routes = [
  { path: 'entrar', component: EntrarComponent },
  { path: 'registrar', component: RegistrarComponent },
];
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test -- --watch=false --include "**/registrar.spec.ts"`
Expected: 3 testes passando.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/auth
git commit -m "feat: tela de registro com validacao espelhando as regras do identity"
```

---

### Task 13: Modelos da API, `CursoService` e listagem de cursos

**Files:**
- Create: `src/app/core/api/modelos/paginacao.ts`, `src/app/core/api/modelos/curso.ts`, `src/app/core/api/curso.service.ts`, `src/app/core/api/curso.service.spec.ts`, `src/app/features/catalogo/lista-cursos/lista-cursos.ts`, `lista-cursos.html`, `lista-cursos.spec.ts`
- Modify: `src/app/features/catalogo/catalogo.routes.ts`

**Interfaces:**
- Consumes: `environment.apiUrl`, `HttpClient`.
- Produces:
  - `interface ResultadoPaginado<T> { items: T[]; pageNumber: number; pageSize: number; totalCount: number; totalPages: number; hasPreviousPage: boolean; hasNextPage: boolean }`
  - `interface Curso { id: number; titulo: string; descricao: string; categoria: string; cargaHoraria: number; dataCriacao: string }`
  - `CursoService.listar(parametros: Signal<{ pagina: number; tamanho: number }>): HttpResourceRef<ResultadoPaginado<Curso> | undefined>`

- [ ] **Step 1: Modelos**

`src/app/core/api/modelos/paginacao.ts`:

```ts
export interface ResultadoPaginado<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ParametrosPaginacao {
  pagina: number;
  tamanho: number;
}
```

`src/app/core/api/modelos/curso.ts`:

```ts
export interface Curso {
  id: number;
  titulo: string;
  descricao: string;
  categoria: string;
  cargaHoraria: number;
  dataCriacao: string;
}
```

- [ ] **Step 2: Teste do service**

`src/app/core/api/curso.service.spec.ts`:

```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CursoService } from './curso.service';
import { ParametrosPaginacao } from './modelos/paginacao';

describe('CursoService', () => {
  it('lista cursos com PageNumber e PageSize na query', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const backend = TestBed.inject(HttpTestingController);
    const servico = TestBed.inject(CursoService);
    const parametros = signal<ParametrosPaginacao>({ pagina: 2, tamanho: 10 });

    const recurso = TestBed.runInInjectionContext(() => servico.listar(parametros));
    await TestBed.tick();

    const req = backend.expectOne((r) => r.url === `${environment.apiUrl}/Course`);
    expect(req.request.params.get('PageNumber')).toBe('2');
    expect(req.request.params.get('PageSize')).toBe('10');
    req.flush({
      items: [{ id: 1, titulo: 'Angular', descricao: 'd', categoria: 'Front', cargaHoraria: 10, dataCriacao: '2026-01-01' }],
      pageNumber: 2,
      pageSize: 10,
      totalCount: 11,
      totalPages: 2,
      hasPreviousPage: true,
      hasNextPage: false,
    });
    await TestBed.tick();

    expect(recurso.value()?.items[0].titulo).toBe('Angular');
    expect(recurso.value()?.totalPages).toBe(2);
    backend.verify();
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test -- --watch=false --include "**/curso.service.spec.ts"`
Expected: FAIL.

- [ ] **Step 4: Implementar o service**

`src/app/core/api/curso.service.ts`:

```ts
import { HttpResourceRef, httpResource } from '@angular/common/http';
import { Injectable, Signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Curso } from './modelos/curso';
import { ParametrosPaginacao, ResultadoPaginado } from './modelos/paginacao';

@Injectable({ providedIn: 'root' })
export class CursoService {
  listar(parametros: Signal<ParametrosPaginacao>): HttpResourceRef<ResultadoPaginado<Curso> | undefined> {
    return httpResource<ResultadoPaginado<Curso>>(() => ({
      url: `${environment.apiUrl}/Course`,
      params: { PageNumber: parametros().pagina, PageSize: parametros().tamanho },
    }));
  }
}
```

Run: `npm test -- --watch=false --include "**/curso.service.spec.ts"` → 1 passando. Se `TestBed.tick()` não existir na sua versão, use `await new Promise((r) => setTimeout(r))` no lugar.

- [ ] **Step 5: Teste da listagem**

`src/app/features/catalogo/lista-cursos/lista-cursos.spec.ts`:

```ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { erroInterceptor } from '../../../core/http/erro.interceptor';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { ListaCursosComponent } from './lista-cursos';

describe('ListaCursosComponent', () => {
  let backend: HttpTestingController;
  let fixture: ComponentFixture<ListaCursosComponent>;
  const notificacao = { sucesso: vi.fn(), erro: vi.fn(), info: vi.fn() };

  beforeEach(async () => {
    notificacao.erro.mockReset();
    await TestBed.configureTestingModule({
      imports: [ListaCursosComponent],
      providers: [
        provideHttpClient(withInterceptors([erroInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificacaoService, useValue: notificacao },
      ],
    }).compileComponents();
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ListaCursosComponent);
    await fixture.whenStable();
  });

  const pagina = (itens: object[], totalCount: number, pageNumber = 1) => ({
    items: itens,
    pageNumber,
    pageSize: 12,
    totalCount,
    totalPages: Math.ceil(totalCount / 12),
    hasPreviousPage: pageNumber > 1,
    hasNextPage: pageNumber * 12 < totalCount,
  });

  it('mostra estado de carregamento e depois os cursos', async () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-teste="carregando"]')).not.toBeNull();
    backend
      .expectOne((r) => r.url === `${environment.apiUrl}/Course`)
      .flush(pagina([{ id: 1, titulo: 'Angular 22', descricao: 'Signals', categoria: 'Front', cargaHoraria: 8, dataCriacao: '2026-01-01' }], 1));
    await fixture.whenStable();
    const texto = (fixture.nativeElement as HTMLElement).textContent;
    expect(texto).toContain('Angular 22');
    expect(texto).toContain('8h');
  });

  it('mostra estado vazio', async () => {
    backend.expectOne((r) => r.url === `${environment.apiUrl}/Course`).flush(pagina([], 0));
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Nenhum curso disponível');
  });

  it('mostra erro e permite tentar de novo', async () => {
    backend
      .expectOne((r) => r.url === `${environment.apiUrl}/Course`)
      .flush({ title: 'Erro', detail: 'Falha ao listar.' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Não foi possível carregar os cursos');
    expect(notificacao.erro).toHaveBeenCalledWith('Falha ao listar.');
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[data-teste="recarregar"]')!.click();
    await fixture.whenStable();
    backend.expectOne((r) => r.url === `${environment.apiUrl}/Course`).flush(pagina([], 0));
  });
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npm test -- --watch=false --include "**/lista-cursos.spec.ts"`
Expected: FAIL.

- [ ] **Step 7: Implementar a listagem**

`src/app/features/catalogo/lista-cursos/lista-cursos.ts`:

```ts
import { Component, inject, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { CursoService } from '../../../core/api/curso.service';
import { ParametrosPaginacao } from '../../../core/api/modelos/paginacao';

const TAMANHO_PAGINA = 12;

@Component({
  selector: 'app-lista-cursos',
  imports: [HlmButtonImports, HlmCardImports, HlmSkeletonImports],
  templateUrl: './lista-cursos.html',
})
export class ListaCursosComponent {
  private readonly cursoService = inject(CursoService);

  protected readonly parametros = signal<ParametrosPaginacao>({ pagina: 1, tamanho: TAMANHO_PAGINA });
  protected readonly cursos = this.cursoService.listar(this.parametros);
  protected readonly esqueletos = Array.from({ length: 6 });

  protected irPara(pagina: number): void {
    this.parametros.update((atual) => ({ ...atual, pagina }));
  }

  protected recarregar(): void {
    this.cursos.reload();
  }
}
```

`src/app/features/catalogo/lista-cursos/lista-cursos.html`:

```html
<div class="flex flex-col gap-6">
  <header>
    <h1 class="text-2xl font-semibold">Cursos</h1>
    <p class="text-muted-foreground">Catálogo disponível para matrícula.</p>
  </header>

  @if (cursos.isLoading()) {
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-teste="carregando">
      @for (_ of esqueletos; track $index) {
        <hlm-skeleton class="h-36 w-full" />
      }
    </div>
  } @else if (cursos.error()) {
    <section hlmCard class="items-center text-center">
      <div hlmCardContent class="flex flex-col items-center gap-3 py-8">
        <p class="text-destructive">Não foi possível carregar os cursos.</p>
        <button hlmBtn variant="outline" type="button" data-teste="recarregar" (click)="recarregar()">
          Tentar novamente
        </button>
      </div>
    </section>
  } @else if (cursos.value(); as pagina) {
    @if (pagina.items.length === 0) {
      <p class="text-muted-foreground py-8 text-center">Nenhum curso disponível no momento.</p>
    } @else {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (curso of pagina.items; track curso.id) {
          <article hlmCard>
            <div hlmCardHeader>
              <h2 hlmCardTitle>{{ curso.titulo }}</h2>
              <p hlmCardDescription>{{ curso.categoria }} · {{ curso.cargaHoraria }}h</p>
            </div>
            <div hlmCardContent>
              <p class="text-muted-foreground line-clamp-3 text-sm">{{ curso.descricao }}</p>
            </div>
          </article>
        }
      </div>

      <nav class="flex items-center justify-center gap-4" aria-label="Paginação">
        <button
          hlmBtn
          variant="outline"
          size="sm"
          type="button"
          [disabled]="!pagina.hasPreviousPage"
          (click)="irPara(pagina.pageNumber - 1)"
        >
          Anterior
        </button>
        <span class="text-muted-foreground text-sm">Página {{ pagina.pageNumber }} de {{ pagina.totalPages }}</span>
        <button
          hlmBtn
          variant="outline"
          size="sm"
          type="button"
          [disabled]="!pagina.hasNextPage"
          (click)="irPara(pagina.pageNumber + 1)"
        >
          Próxima
        </button>
      </nav>
    }
  }
</div>
```

`src/app/features/catalogo/catalogo.routes.ts`:

```ts
import { Routes } from '@angular/router';
import { ListaCursosComponent } from './lista-cursos/lista-cursos';

export const CATALOGO_ROUTES: Routes = [{ path: '', component: ListaCursosComponent }];
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npm test -- --watch=false --include "**/lista-cursos.spec.ts"`
Expected: 3 testes passando. Se o `expectOne` acontecer antes de o `httpResource` disparar, insira `await TestBed.tick()` (ou `await new Promise((r) => setTimeout(r))`) logo após `fixture.whenStable()` no `beforeEach`.

- [ ] **Step 9: Verificação manual ponta a ponta**

Com a API rodando: `npm start`, registrar um aluno em `/registrar`, entrar, ver `/cursos` (com a API vazia, o estado "Nenhum curso disponível" aparece; crie um curso pelo Swagger com um usuário Admin para ver os cards).

- [ ] **Step 10: Commit**

```bash
git add src/app/core/api src/app/features/catalogo
git commit -m "feat: listagem paginada de cursos com httpResource"
```

---

### Task 14: Testes E2E com Playwright

**Files:**
- Create: `e2e/playwright.config.ts`, `e2e/entrar.spec.ts`, `e2e/rota-protegida.spec.ts`, `e2e/tsconfig.json`
- Modify: `package.json` (script `e2e`), `.gitignore`, `tsconfig.json` (exclude `e2e`) se o build reclamar

- [ ] **Step 1: Instalar**

```bash
npm i -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Configuração**

`e2e/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 120_000,
    cwd: '..',
  },
});
```

`e2e/tsconfig.json`:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": { "types": ["node"], "module": "esnext", "moduleResolution": "bundler" },
  "include": ["**/*.ts"]
}
```

Em `package.json` → scripts: `"e2e": "playwright test -c e2e/playwright.config.ts"`. Em `.gitignore`, adicione `test-results/` e `playwright-report/`. Se `ng build` passar a incluir `e2e/`, adicione `"e2e"` ao `exclude` de `tsconfig.app.json`.

- [ ] **Step 3: Fluxo registrar → entrar**

`e2e/entrar.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const API_URL = process.env['API_URL'] ?? 'http://localhost:5130';

test.beforeAll(async ({ request }) => {
  const saude = await request.get(`${API_URL}/health/ready`).catch(() => null);
  test.skip(!saude?.ok(), `API indisponível em ${API_URL}; suba com docker-compose no repo tech-curse.`);
});

test('registra um aluno, entra e vê o catálogo', async ({ page }) => {
  const email = `aluno+${Date.now()}@teste.dev`;
  const senha = 'Senha@123';

  await page.goto('/registrar');
  await page.getByLabel('Nome de usuário').fill(`aluno${Date.now()}`);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByLabel('Confirmar senha').fill(senha);
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await expect(page).toHaveURL(/\/entrar$/);

  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/cursos$/);
  await expect(page.getByRole('heading', { name: 'Cursos' })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
});
```

- [ ] **Step 4: Fluxo de rota protegida**

`e2e/rota-protegida.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const API_URL = process.env['API_URL'] ?? 'http://localhost:5130';

test.beforeAll(async ({ request }) => {
  const saude = await request.get(`${API_URL}/health/ready`).catch(() => null);
  test.skip(!saude?.ok(), `API indisponível em ${API_URL}; suba com docker-compose no repo tech-curse.`);
});

test('rota protegida redireciona para /entrar e volta após login', async ({ page, request }) => {
  const email = `aluno+${Date.now()}@teste.dev`;
  const senha = 'Senha@123';
  const registro = await request.post(`${API_URL}/tech-curse/Auth/register`, {
    data: { name: `aluno${Date.now()}`, email, role: 'Student', password: senha, confirmPassword: senha },
  });
  expect(registro.status()).toBe(201);

  await page.goto('/cursos');
  await expect(page).toHaveURL(/\/entrar\?returnUrl=%2Fcursos$/);

  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/cursos$/);
});
```

- [ ] **Step 5: Rodar**

Pré-condição: `docker-compose up -d` em `../tech-curse`. Run: `npm run e2e`
Expected: 2 testes passando (ou 2 pulados com a mensagem de API indisponível, se ela não estiver de pé — nesse caso suba a API e rode de novo antes de commitar).

- [ ] **Step 6: Commit**

```bash
git add e2e package.json package-lock.json .gitignore tsconfig.app.json
git commit -m "test: fluxos e2e de registro, login e rota protegida com playwright"
```

---

### Task 15: Documentação do projeto

**Files:**
- Create: `CLAUDE.md`, `README.md` (substitui o gerado pelo `ng new`)

- [ ] **Step 1: `CLAUDE.md`**

````markdown
# CLAUDE.md

Front-end Angular da **Tech Curse** (plataforma de cursos). Consome a Tech Curse API (repositório irmão `../tech-curse`, .NET 10).

> O projeto é documentado em **português brasileiro**: commits, docs, textos de UI e identificadores em pt-BR. Comentários em código são permitidos, mas só quando explicam um porquê não óbvio.

## Comandos

```bash
npm start            # ng serve em http://localhost:4200
npm test             # Vitest (unitários); --include "**/x.spec.ts" para um arquivo
npm run e2e          # Playwright; exige a API rodando (docker-compose up -d em ../tech-curse)
npm run lint         # angular-eslint
npm run format       # prettier (ordena classes Tailwind)
npx ng g @spartan-ng/cli:ui <primitivo> --angularCli=true --directory=src/app/shared/ui
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
````

- [ ] **Step 2: `README.md`**

````markdown
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

## Stack

Angular 22 · Tailwind CSS 4 · spartan/ui · tema SimUI · Vitest · Playwright
````

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: documentar comandos, arquitetura e convencoes do front-end"
```

---

## Verificação final da fase

- [ ] `npm run lint`, `npm run format:check`, `npm test -- --watch=false` e `npx ng build` passam.
- [ ] `npm run e2e` passa com a API de pé.
- [ ] Manual: modo escuro alterna e persiste após reload; navegação mobile abre/fecha; `/admin` com aluno logado cai em `/sem-permissao`; URL inexistente cai na página 404; após 401 com refresh válido a requisição é repetida sem deslogar (observar na aba Network após expirar o token manualmente no `localStorage`).
