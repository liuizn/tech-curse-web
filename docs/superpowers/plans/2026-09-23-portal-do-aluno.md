# Fase 2 — Portal do Aluno: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar ao aluno o catálogo com ordenação, filtro e detalhe, a matrícula, "Meus cursos", "Meus pagamentos" (com o curso) e o perfil editável, sobre a base da Fase 1.

**Architecture:** Um `PerfilAlunoService` (signals + `httpResource`) carrega `/Student/me` e as matrículas uma vez e é lido pelo catálogo, pelo detalhe e pela área `/aluno`. Services de API finos (`CursoService`, `MatriculaService`, `AlunoApiService`, `PagamentoService`) isolam as rotas. Estado de listas na query string, lido por inputs de rota (`withComponentInputBinding`).

**Tech Stack:** Angular 22 (standalone, signals, zoneless), Tailwind 4, spartan/ui (helm em `src/app/shared/ui`), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-23-portal-do-aluno-design.md` (revisado depois dos PRs do backend #39 e #40).

## Global Constraints

- pt-BR em textos de UI, identificadores, commits e docs. Comentários em código só para um porquê não óbvio.
- Conventional Commits em pt-BR. **Sem** linhas `Co-Authored-By`, "Generated with" ou qualquer atribuição de IA.
- Branch: `feat/portal-do-aluno` (já existe, com o spec).
- Antes de cada commit: `npm run format`, `npm run lint`, `npm test -- --watch=false` (suíte toda) e `npx ng build`.
- Um spec só: `npm test -- --watch=false --include "**/<arquivo>.spec.ts"`.
- Testes zoneless: depois de criar componentes ou mudar signals que disparam `httpResource`, use `TestBed.tick()` antes de `HttpTestingController.expectOne`; `fixture.whenStable()` trava com `httpResource` pendente (Fase 1).
- O erro de um `httpResource` pode chegar embrulhado (`ResourceWrappedError` com `cause`); leia o `ErroApi` com `extrairErroApi` (Task 3), nunca direto de `.error()`.
- Contratos da API (base `environment.apiUrl`): `GET /Student/me` → `{ id, nome, email, dataCadastro }` (404 = perfil pendente); `PUT /Student/{id}` `{ nome }` → 204, 422 `errors.Nome`; `GET /Student/{id}/enrollments` → `[{ courseId, titulo, descricao, categoria, matriculaAtiva, enrollmentId }]`; `GET /Course` com `PageNumber`, `PageSize`, `SortBy`, `SortDirection`, `Categoria`; `GET /Course/{id}`; `POST /Enrollment` `{ courseId, studentId }` → 202, 409 já matriculado; `GET /Payment/student/{id}` com `PageNumber`, `PageSize` → paginado de `{ paymentId, enrollmentId, studentId, amount, status, isActive, createdAt, paidAt, externalTransactionId, courseId, courseTitulo }`.
- Status de pagamento vêm como string: `Pending`, `Paid`, `Failed`, `Refunded` → "Pendente", "Pago", "Falhou", "Estornado".
- Tamanhos de página: catálogo 12, pagamentos 10.
- Não edite à mão os arquivos gerados em `src/app/shared/ui`. Selos, select e tabela desta fase são HTML com classes Tailwind do tema (`bg-primary`, `text-muted-foreground`, `border-border`, `bg-destructive/10`…).

---

## Mapa de arquivos

| Arquivo | Task |
|---|---|
| `src/app/core/http/erro.interceptor.ts` (+spec) — `SILENCIAR_ERRO` | 1 |
| `src/app/app.config.ts`, `src/app/app.config.spec.ts` (novo) — locale pt-BR | 1 |
| `src/app/core/api/modelos/aluno.ts`, `pagamento.ts` (novos) | 2 |
| `src/app/core/api/curso.service.ts` (+spec) — ordem, categoria, `obter` | 2 |
| `src/app/core/api/matricula.service.ts`, `aluno-api.service.ts`, `pagamento.service.ts` (+specs, novos) | 2 |
| `src/app/core/http/erro-api.ts` (+spec) — `extrairErroApi` | 3 |
| `src/app/core/aluno/perfil-aluno.service.ts` (+spec, novo) | 3 |
| `src/app/features/catalogo/lista-cursos/*` | 4 |
| `src/app/features/catalogo/detalhe-curso/*` (novo), `catalogo.routes.ts` | 5 |
| `src/app/features/aluno/aluno-layout/*`, `meus-cursos/*` (novos), `aluno.routes.ts`, `shell.ts` (+spec), `app.routes.spec.ts` | 6 |
| `src/app/features/aluno/meus-pagamentos/*` (novo), `aluno.routes.ts`, `shell.ts` (+spec) | 7 |
| `src/app/features/aluno/perfil/*` (novo), `aluno.routes.ts`, `shell.ts` (+spec) | 8 |
| `e2e/apoio/api.ts`, `e2e/portal-do-aluno.spec.ts` (novos), `e2e/entrar.spec.ts`, `e2e/rota-protegida.spec.ts`, `CLAUDE.md`, `README.md` | 9 |

---

### Task 1: `SILENCIAR_ERRO` e locale pt-BR

**Files:**
- Modify: `src/app/core/http/erro.interceptor.ts`, `src/app/core/http/erro.interceptor.spec.ts`
- Modify: `src/app/app.config.ts`
- Create: `src/app/app.config.spec.ts`

**Interfaces:**
- Produces: `export const SILENCIAR_ERRO: HttpContextToken<boolean>` (padrão `false`) em `core/http/erro.interceptor.ts`; `appConfig` fornece `LOCALE_ID = 'pt-BR'` e `DEFAULT_CURRENCY_CODE = 'BRL'`.

- [ ] **Step 1: Testes que falham**

No fim do `describe` de `erro.interceptor.spec.ts` (o arquivo já monta `http`, `backend` e o mock `notificacao`; reaproveite-os e acrescente `HttpContext` ao import de `@angular/common/http` e `SILENCIAR_ERRO` ao import de `./erro.interceptor`):

```ts
  it('com SILENCIAR_ERRO converte o erro mas não mostra toast', async () => {
    const erro = new Promise<ErroApi>((resolve) =>
      http
        .get('/api/silenciosa', { context: new HttpContext().set(SILENCIAR_ERRO, true) })
        .subscribe({ error: resolve }),
    );
    backend
      .expectOne('/api/silenciosa')
      .flush({ title: 'Não encontrado', detail: 'Perfil inexistente.' }, { status: 404, statusText: 'Not Found' });
    const recebido = await erro;
    expect(recebido.status).toBe(404);
    expect(recebido.detalhe).toBe('Perfil inexistente.');
    expect(notificacao.erro).not.toHaveBeenCalled();
  });

  it('com SILENCIAR_ERRO também não mostra toast em 500', async () => {
    const erro = new Promise<ErroApi>((resolve) =>
      http
        .get('/api/silenciosa', { context: new HttpContext().set(SILENCIAR_ERRO, true) })
        .subscribe({ error: resolve }),
    );
    backend.expectOne('/api/silenciosa').flush({ detail: 'Falhou.' }, { status: 500, statusText: 'Server Error' });
    expect((await erro).status).toBe(500);
    expect(notificacao.erro).not.toHaveBeenCalled();
  });
```

Se o mock de notificação do arquivo tiver outro nome, use o nome existente.

Crie `src/app/app.config.spec.ts`:

```ts
import { CurrencyPipe, DatePipe } from '@angular/common';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';

describe('appConfig', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: appConfig.providers }));

  it('usa locale pt-BR e moeda BRL', () => {
    expect(TestBed.inject(LOCALE_ID)).toBe('pt-BR');
    expect(TestBed.inject(DEFAULT_CURRENCY_CODE)).toBe('BRL');
  });

  it('formata moeda e data no padrão brasileiro', () => {
    const moeda = new CurrencyPipe('pt-BR', 'BRL').transform(1234.5);
    expect(moeda).toContain('R$');
    expect(moeda).toContain('1.234,50');
    expect(new DatePipe('pt-BR').transform('2026-09-23T12:00:00Z', 'dd/MM/yyyy', 'UTC')).toBe('23/09/2026');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --watch=false --include "**/erro.interceptor.spec.ts" --include "**/app.config.spec.ts"`
Expected: FAIL — `SILENCIAR_ERRO` não existe; `LOCALE_ID` é `en-US`; locale `pt-BR` não registrado.

- [ ] **Step 3: Implementar**

`erro.interceptor.ts`: acrescente `HttpContextToken` ao import de `@angular/common/http` e:

```ts
export const SILENCIAR_ERRO = new HttpContextToken<boolean>(() => false);
```

e, no interceptor, troque a condição do toast por:

```ts
      if (!STATUS_TRATADOS_LOCALMENTE.has(erroApi.status) && !req.context.get(SILENCIAR_ERRO)) {
        notificacao.erro(erroApi.detalhe);
      }
```

`app.config.ts`:

```ts
import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { tokenInterceptor } from './core/auth/token.interceptor';
import { erroInterceptor } from './core/http/erro.interceptor';

registerLocaleData(localePt, 'pt-BR');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([erroInterceptor, tokenInterceptor])),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
  ],
};
```

(Mantenha qualquer provider que o arquivo atual tiver e o acima não mostre.)

- [ ] **Step 4: Rodar e ver passar**

Run: o mesmo do Step 2. Expected: PASS.

- [ ] **Step 5: Verificar e commit**

```bash
npm run format && npm run lint && npm test -- --watch=false && npx ng build
git add src/app/core/http/erro.interceptor.ts src/app/core/http/erro.interceptor.spec.ts src/app/app.config.ts src/app/app.config.spec.ts
git commit -m "feat: silenciar toasts de erros esperados e registrar locale pt-BR"
```

---

### Task 2: Modelos e services de API

**Files:**
- Create: `src/app/core/api/modelos/aluno.ts`, `src/app/core/api/modelos/pagamento.ts`
- Modify: `src/app/core/api/curso.service.ts`, `src/app/core/api/curso.service.spec.ts`
- Create: `src/app/core/api/matricula.service.ts` (+`.spec.ts`), `src/app/core/api/aluno-api.service.ts` (+`.spec.ts`), `src/app/core/api/pagamento.service.ts` (+`.spec.ts`)

**Interfaces:**
- Produces:
  - `PerfilAluno { id: number; nome: string; email: string; dataCadastro: string }`, `MatriculaAluno { courseId; titulo; descricao; categoria; matriculaAtiva: boolean; enrollmentId: number }` em `modelos/aluno.ts`.
  - `StatusPagamento = 'Pending' | 'Paid' | 'Failed' | 'Refunded'`, `Pagamento { paymentId; enrollmentId; studentId; amount: number; status: StatusPagamento; isActive: boolean; createdAt: string; paidAt: string | null; externalTransactionId: string | null; courseId: number; courseTitulo: string }` em `modelos/pagamento.ts`.
  - `OrdemCursos = 'recentes' | 'titulo-asc' | 'titulo-desc' | 'categoria'`, `ORDEM_PADRAO: OrdemCursos = 'recentes'`, `ehOrdemCursos(valor: unknown): valor is OrdemCursos`, `ParametrosCatalogo = ParametrosPaginacao & { ordem?: OrdemCursos; categoria?: string | null }`, `CursoService.listar(parametros: Signal<ParametrosCatalogo>)`, `CursoService.obter(id: Signal<number | null>): HttpResourceRef<Curso | undefined>`.
  - `MatriculaService.matricular(courseId: number, studentId: number): Promise<void>`.
  - `AlunoApiService.atualizarNome(id: number, nome: string): Promise<void>`.
  - `PagamentoService.listarDoAluno(studentId: Signal<number | null>, parametros: Signal<ParametrosPaginacao>): HttpResourceRef<ResultadoPaginado<Pagamento> | undefined>`.

- [ ] **Step 1: Modelos**

`src/app/core/api/modelos/aluno.ts`:

```ts
export interface PerfilAluno {
  id: number;
  nome: string;
  email: string;
  dataCadastro: string;
}

export interface MatriculaAluno {
  courseId: number;
  titulo: string;
  descricao: string;
  categoria: string;
  matriculaAtiva: boolean;
  enrollmentId: number;
}
```

`src/app/core/api/modelos/pagamento.ts`:

```ts
export type StatusPagamento = 'Pending' | 'Paid' | 'Failed' | 'Refunded';

export interface Pagamento {
  paymentId: number;
  enrollmentId: number;
  studentId: number;
  amount: number;
  status: StatusPagamento;
  isActive: boolean;
  createdAt: string;
  paidAt: string | null;
  externalTransactionId: string | null;
  courseId: number;
  courseTitulo: string;
}
```

- [ ] **Step 2: Testes que falham**

Acrescente a `curso.service.spec.ts` (mesmo `describe`; reaproveite o padrão do teste existente):

```ts
  function configurar() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    return { backend: TestBed.inject(HttpTestingController), servico: TestBed.inject(CursoService) };
  }

  it('usa "recentes" como ordem padrão e não manda Categoria vazia', async () => {
    const { backend, servico } = configurar();
    TestBed.runInInjectionContext(() => servico.listar(signal({ pagina: 1, tamanho: 12 })));
    await TestBed.tick();
    const req = backend.expectOne((r) => r.url === `${environment.apiUrl}/Course`);
    expect(req.request.params.get('SortBy')).toBe('datacriacao');
    expect(req.request.params.get('SortDirection')).toBe('desc');
    expect(req.request.params.has('Categoria')).toBe(false);
    req.flush({ items: [], pageNumber: 1, pageSize: 12, totalCount: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false });
  });

  it('traduz ordem e categoria para os parâmetros da API', async () => {
    const { backend, servico } = configurar();
    TestBed.runInInjectionContext(() =>
      servico.listar(signal({ pagina: 1, tamanho: 12, ordem: 'titulo-desc' as const, categoria: 'Front' })),
    );
    await TestBed.tick();
    const req = backend.expectOne((r) => r.url === `${environment.apiUrl}/Course`);
    expect(req.request.params.get('SortBy')).toBe('titulo');
    expect(req.request.params.get('SortDirection')).toBe('desc');
    expect(req.request.params.get('Categoria')).toBe('Front');
    req.flush({ items: [], pageNumber: 1, pageSize: 12, totalCount: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false });
  });

  it('obter busca o curso pelo id e não faz requisição com id nulo', async () => {
    const { backend, servico } = configurar();
    const id = signal<number | null>(null);
    const recurso = TestBed.runInInjectionContext(() => servico.obter(id));
    await TestBed.tick();
    backend.expectNone(() => true);
    id.set(7);
    await TestBed.tick();
    backend
      .expectOne(`${environment.apiUrl}/Course/7`)
      .flush({ id: 7, titulo: 'Curso 7', descricao: 'd', categoria: 'Tech', cargaHoraria: 4, dataCriacao: '2026-01-01' });
    await TestBed.tick();
    expect(recurso.value()?.titulo).toBe('Curso 7');
  });

  it('ehOrdemCursos só aceita as quatro ordens', () => {
    expect(ehOrdemCursos('titulo-asc')).toBe(true);
    expect(ehOrdemCursos('preco')).toBe(false);
    expect(ehOrdemCursos(undefined)).toBe(false);
  });
```

(Acrescente `ehOrdemCursos` ao import de `./curso.service`.)

`src/app/core/api/matricula.service.spec.ts`:

```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { MatriculaService } from './matricula.service';

describe('MatriculaService', () => {
  it('faz POST /Enrollment com courseId e studentId', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const backend = TestBed.inject(HttpTestingController);
    const promessa = TestBed.inject(MatriculaService).matricular(3, 9);
    const req = backend.expectOne(`${environment.apiUrl}/Enrollment`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ courseId: 3, studentId: 9 });
    req.flush({ mensagem: 'Aluno matriculado com sucesso.' }, { status: 202, statusText: 'Accepted' });
    await expect(promessa).resolves.toBeUndefined();
  });
});
```

`src/app/core/api/aluno-api.service.spec.ts`:

```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AlunoApiService } from './aluno-api.service';

describe('AlunoApiService', () => {
  it('faz PUT /Student/{id} com o nome', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const backend = TestBed.inject(HttpTestingController);
    const promessa = TestBed.inject(AlunoApiService).atualizarNome(4, 'Novo Nome');
    const req = backend.expectOne(`${environment.apiUrl}/Student/4`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nome: 'Novo Nome' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    await expect(promessa).resolves.toBeUndefined();
  });
});
```

`src/app/core/api/pagamento.service.spec.ts`:

```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ParametrosPaginacao } from './modelos/paginacao';
import { PagamentoService } from './pagamento.service';

describe('PagamentoService', () => {
  it('não busca sem studentId e busca com paginação quando o id chega', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const backend = TestBed.inject(HttpTestingController);
    const studentId = signal<number | null>(null);
    const parametros = signal<ParametrosPaginacao>({ pagina: 2, tamanho: 10 });
    const recurso = TestBed.runInInjectionContext(() =>
      TestBed.inject(PagamentoService).listarDoAluno(studentId, parametros),
    );
    await TestBed.tick();
    backend.expectNone(() => true);

    studentId.set(5);
    await TestBed.tick();
    const req = backend.expectOne((r) => r.url === `${environment.apiUrl}/Payment/student/5`);
    expect(req.request.params.get('PageNumber')).toBe('2');
    expect(req.request.params.get('PageSize')).toBe('10');
    req.flush({ items: [], pageNumber: 2, pageSize: 10, totalCount: 0, totalPages: 0, hasPreviousPage: true, hasNextPage: false });
    await TestBed.tick();
    expect(recurso.value()?.pageNumber).toBe(2);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test -- --watch=false --include "**/core/api/*.spec.ts"`
Expected: FAIL — `ehOrdemCursos`, `obter` e os três services não existem.

- [ ] **Step 4: Implementar**

`curso.service.ts`:

```ts
import { HttpResourceRef, httpResource } from '@angular/common/http';
import { Injectable, Signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Curso } from './modelos/curso';
import { ParametrosPaginacao, ResultadoPaginado } from './modelos/paginacao';

export type OrdemCursos = 'recentes' | 'titulo-asc' | 'titulo-desc' | 'categoria';

export const ORDEM_PADRAO: OrdemCursos = 'recentes';

const ORDENACAO_NA_API: Record<OrdemCursos, { sortBy: string; sortDirection: 'asc' | 'desc' }> = {
  recentes: { sortBy: 'datacriacao', sortDirection: 'desc' },
  'titulo-asc': { sortBy: 'titulo', sortDirection: 'asc' },
  'titulo-desc': { sortBy: 'titulo', sortDirection: 'desc' },
  categoria: { sortBy: 'categoria', sortDirection: 'asc' },
};

export function ehOrdemCursos(valor: unknown): valor is OrdemCursos {
  return typeof valor === 'string' && valor in ORDENACAO_NA_API;
}

export type ParametrosCatalogo = ParametrosPaginacao & {
  ordem?: OrdemCursos;
  categoria?: string | null;
};

@Injectable({ providedIn: 'root' })
export class CursoService {
  listar(
    parametros: Signal<ParametrosCatalogo>,
  ): HttpResourceRef<ResultadoPaginado<Curso> | undefined> {
    return httpResource<ResultadoPaginado<Curso>>(() => {
      const { pagina, tamanho, ordem, categoria } = parametros();
      const ordenacao = ORDENACAO_NA_API[ordem ?? ORDEM_PADRAO];
      const params: Record<string, string | number> = {
        PageNumber: pagina,
        PageSize: tamanho,
        SortBy: ordenacao.sortBy,
        SortDirection: ordenacao.sortDirection,
      };
      if (categoria) params['Categoria'] = categoria;
      return { url: `${environment.apiUrl}/Course`, params };
    });
  }

  obter(id: Signal<number | null>): HttpResourceRef<Curso | undefined> {
    return httpResource<Curso>(() => {
      const valor = id();
      return valor === null ? undefined : `${environment.apiUrl}/Course/${valor}`;
    });
  }
}
```

`matricula.service.ts`:

```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MatriculaService {
  private readonly http = inject(HttpClient);

  async matricular(courseId: number, studentId: number): Promise<void> {
    await firstValueFrom(this.http.post(`${environment.apiUrl}/Enrollment`, { courseId, studentId }));
  }
}
```

`aluno-api.service.ts`:

```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AlunoApiService {
  private readonly http = inject(HttpClient);

  async atualizarNome(id: number, nome: string): Promise<void> {
    await firstValueFrom(this.http.put(`${environment.apiUrl}/Student/${id}`, { nome }));
  }
}
```

`pagamento.service.ts`:

```ts
import { HttpResourceRef, httpResource } from '@angular/common/http';
import { Injectable, Signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Pagamento } from './modelos/pagamento';
import { ParametrosPaginacao, ResultadoPaginado } from './modelos/paginacao';

@Injectable({ providedIn: 'root' })
export class PagamentoService {
  listarDoAluno(
    studentId: Signal<number | null>,
    parametros: Signal<ParametrosPaginacao>,
  ): HttpResourceRef<ResultadoPaginado<Pagamento> | undefined> {
    return httpResource<ResultadoPaginado<Pagamento>>(() => {
      const id = studentId();
      if (id === null) return undefined;
      const { pagina, tamanho } = parametros();
      return {
        url: `${environment.apiUrl}/Payment/student/${id}`,
        params: { PageNumber: pagina, PageSize: tamanho },
      };
    });
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: o mesmo do Step 3, depois a suíte toda (o teste existente do `CursoService` e o da `ListaCursosComponent` continuam passando: a ordem padrão só acrescenta parâmetros).

- [ ] **Step 6: Verificar e commit**

```bash
npm run format && npm run lint && npm test -- --watch=false && npx ng build
git add src/app/core/api
git commit -m "feat: services de matricula, perfil e pagamentos e catalogo com ordem e categoria"
```

---

### Task 3: `extrairErroApi` e `PerfilAlunoService`

**Files:**
- Modify: `src/app/core/http/erro-api.ts` (+ criar `src/app/core/http/erro-api.spec.ts` se não existir)
- Create: `src/app/core/aluno/perfil-aluno.service.ts`, `src/app/core/aluno/perfil-aluno.service.spec.ts`

**Interfaces:**
- Consumes: `SILENCIAR_ERRO` (Task 1); `PerfilAluno`, `MatriculaAluno` (Task 2); `AutenticacaoService.role: Signal<Role | null>` (Fase 1).
- Produces:
  - `extrairErroApi(erro: unknown): ErroApi | null` em `core/http/erro-api.ts` — aceita o `ErroApi` direto ou dentro de `cause`.
  - `EstadoPerfilAluno = 'inativo' | 'carregando' | 'pendente' | 'ativo' | 'erro'`.
  - `PerfilAlunoService`: `estado: Signal<EstadoPerfilAluno>`, `perfil: Signal<PerfilAluno | null>`, `matriculasRecurso: HttpResourceRef<MatriculaAluno[] | undefined>`, `matriculas: Signal<MatriculaAluno[]>`, `cursosMatriculados: Signal<ReadonlySet<number>>`, `recarregarPerfil(): void`, `recarregarMatriculas(): void`.

- [ ] **Step 1: Testes que falham**

`src/app/core/http/erro-api.spec.ts` (se o arquivo já existir, acrescente o `describe`):

```ts
import { extrairErroApi } from './erro-api';

describe('extrairErroApi', () => {
  const erro = { status: 404, titulo: 'Não encontrado', detalhe: 'Sem perfil.' };

  it('aceita o ErroApi direto', () => expect(extrairErroApi(erro)).toEqual(erro));

  it('aceita o ErroApi dentro de cause', () => {
    const embrulhado = Object.assign(new Error('embrulhado'), { cause: erro });
    expect(extrairErroApi(embrulhado)).toEqual(erro);
  });

  it('devolve null para outros valores', () => {
    expect(extrairErroApi(new Error('x'))).toBeNull();
    expect(extrairErroApi(undefined)).toBeNull();
  });
});
```

`src/app/core/aluno/perfil-aluno.service.spec.ts`:

```ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AutenticacaoService } from '../auth/autenticacao.service';
import { Role } from '../auth/jwt';
import { erroInterceptor } from '../http/erro.interceptor';
import { NotificacaoService } from '../notificacao/notificacao.service';
import { PerfilAlunoService } from './perfil-aluno.service';

describe('PerfilAlunoService', () => {
  const role = signal<Role | null>(null);
  const notificacao = { sucesso: vi.fn(), erro: vi.fn(), info: vi.fn() };
  let backend: HttpTestingController;
  let servico: PerfilAlunoService;
  const perfil = { id: 3, nome: 'Aluno', email: 'aluno@teste.dev', dataCadastro: '2026-09-01T00:00:00Z' };
  const matriculas = [
    { courseId: 10, titulo: 'A', descricao: 'd', categoria: 'Front', matriculaAtiva: true, enrollmentId: 100 },
    { courseId: 11, titulo: 'B', descricao: 'd', categoria: 'Back', matriculaAtiva: false, enrollmentId: 101 },
  ];

  beforeEach(() => {
    role.set(null);
    notificacao.erro.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([erroInterceptor])),
        provideHttpClientTesting(),
        { provide: AutenticacaoService, useValue: { role } },
        { provide: NotificacaoService, useValue: notificacao },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    servico = TestBed.inject(PerfilAlunoService);
  });

  afterEach(() => backend.verify());

  it('fica inativo e não chama /me para quem não é aluno', async () => {
    role.set('Admin');
    await TestBed.tick();
    backend.expectNone(`${environment.apiUrl}/Student/me`);
    expect(servico.estado()).toBe('inativo');
    expect(servico.perfil()).toBeNull();
  });

  it('carrega o perfil e depois as matrículas', async () => {
    role.set('Student');
    await TestBed.tick();
    expect(servico.estado()).toBe('carregando');
    backend.expectOne(`${environment.apiUrl}/Student/me`).flush(perfil);
    await TestBed.tick();
    expect(servico.estado()).toBe('ativo');
    expect(servico.perfil()?.id).toBe(3);
    backend.expectOne(`${environment.apiUrl}/Student/3/enrollments`).flush(matriculas);
    await TestBed.tick();
    expect(servico.matriculas()).toHaveLength(2);
    expect(servico.cursosMatriculados().has(10)).toBe(true);
    expect(servico.cursosMatriculados().has(99)).toBe(false);
  });

  it('404 no /me vira pendente, sem toast e sem buscar matrículas', async () => {
    role.set('Student');
    await TestBed.tick();
    backend
      .expectOne(`${environment.apiUrl}/Student/me`)
      .flush({ title: 'Não encontrado', detail: 'Perfil não encontrado.' }, { status: 404, statusText: 'Not Found' });
    await TestBed.tick();
    expect(servico.estado()).toBe('pendente');
    expect(notificacao.erro).not.toHaveBeenCalled();
    backend.expectNone((r) => r.url.includes('/enrollments'));
  });

  it('500 no /me vira erro', async () => {
    role.set('Student');
    await TestBed.tick();
    backend
      .expectOne(`${environment.apiUrl}/Student/me`)
      .flush({ detail: 'Falhou.' }, { status: 500, statusText: 'Server Error' });
    await TestBed.tick();
    expect(servico.estado()).toBe('erro');
  });

  it('volta a inativo quando a role deixa de ser Student', async () => {
    role.set('Student');
    await TestBed.tick();
    backend.expectOne(`${environment.apiUrl}/Student/me`).flush(perfil);
    await TestBed.tick();
    backend.expectOne(`${environment.apiUrl}/Student/3/enrollments`).flush(matriculas);
    await TestBed.tick();
    role.set(null);
    await TestBed.tick();
    expect(servico.estado()).toBe('inativo');
    expect(servico.perfil()).toBeNull();
    expect(servico.matriculas()).toEqual([]);
  });

  it('recarregarMatriculas busca de novo', async () => {
    role.set('Student');
    await TestBed.tick();
    backend.expectOne(`${environment.apiUrl}/Student/me`).flush(perfil);
    await TestBed.tick();
    backend.expectOne(`${environment.apiUrl}/Student/3/enrollments`).flush([]);
    await TestBed.tick();
    servico.recarregarMatriculas();
    await TestBed.tick();
    backend.expectOne(`${environment.apiUrl}/Student/3/enrollments`).flush(matriculas);
    await TestBed.tick();
    expect(servico.matriculas()).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --watch=false --include "**/erro-api.spec.ts" --include "**/perfil-aluno.service.spec.ts"`
Expected: FAIL — `extrairErroApi` e `PerfilAlunoService` não existem.

- [ ] **Step 3: Implementar**

Acrescente a `erro-api.ts`:

```ts
export function extrairErroApi(erro: unknown): ErroApi | null {
  if (ehErroApi(erro)) return erro;
  const causa = typeof erro === 'object' && erro !== null ? (erro as { cause?: unknown }).cause : undefined;
  return ehErroApi(causa) ? causa : null;
}
```

`src/app/core/aluno/perfil-aluno.service.ts`:

```ts
import { HttpContext, httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { MatriculaAluno, PerfilAluno } from '../api/modelos/aluno';
import { AutenticacaoService } from '../auth/autenticacao.service';
import { extrairErroApi } from '../http/erro-api';
import { SILENCIAR_ERRO } from '../http/erro.interceptor';

export type EstadoPerfilAluno = 'inativo' | 'carregando' | 'pendente' | 'ativo' | 'erro';

@Injectable({ providedIn: 'root' })
export class PerfilAlunoService {
  private readonly auth = inject(AutenticacaoService);
  private readonly ehAluno = computed(() => this.auth.role() === 'Student');

  private readonly perfilRecurso = httpResource<PerfilAluno>(() =>
    this.ehAluno()
      ? {
          url: `${environment.apiUrl}/Student/me`,
          context: new HttpContext().set(SILENCIAR_ERRO, true),
        }
      : undefined,
  );

  readonly estado = computed<EstadoPerfilAluno>(() => {
    if (!this.ehAluno()) return 'inativo';
    if (this.perfilRecurso.isLoading()) return 'carregando';
    const erro = this.perfilRecurso.error();
    if (erro) return extrairErroApi(erro)?.status === 404 ? 'pendente' : 'erro';
    return this.perfilRecurso.hasValue() ? 'ativo' : 'carregando';
  });

  readonly perfil = computed<PerfilAluno | null>(() =>
    this.estado() === 'ativo' ? (this.perfilRecurso.value() ?? null) : null,
  );

  readonly matriculasRecurso = httpResource<MatriculaAluno[]>(() => {
    const perfil = this.perfil();
    return perfil ? `${environment.apiUrl}/Student/${perfil.id}/enrollments` : undefined;
  });

  readonly matriculas = computed<MatriculaAluno[]>(() =>
    this.perfil() && this.matriculasRecurso.hasValue() ? this.matriculasRecurso.value() : [],
  );

  readonly cursosMatriculados = computed<ReadonlySet<number>>(
    () => new Set(this.matriculas().map((matricula) => matricula.courseId)),
  );

  recarregarPerfil(): void {
    this.perfilRecurso.reload();
  }

  recarregarMatriculas(): void {
    this.matriculasRecurso.reload();
  }
}
```

Se `hasValue()` não estiver disponível na versão instalada, use `this.perfilRecurso.value() !== undefined`. Se o teste "volta a inativo" mostrar valor antigo depois da troca de role, confirme que o request `undefined` coloca o recurso em `idle` (valor `undefined`); o `perfil()` já não depende disso porque só lê o valor quando o estado é `ativo`.

- [ ] **Step 4: Rodar e ver passar**

Run: o mesmo do Step 2. Expected: PASS.

- [ ] **Step 5: Verificar e commit**

```bash
npm run format && npm run lint && npm test -- --watch=false && npx ng build
git add src/app/core/http/erro-api.ts src/app/core/http/erro-api.spec.ts src/app/core/aluno
git commit -m "feat: servico de perfil do aluno com estado pendente e matriculas"
```

---

### Task 4: Catálogo com ordenação, filtro, selo e link

**Files:**
- Modify: `src/app/features/catalogo/lista-cursos/lista-cursos.ts`, `.html`, `.spec.ts`

**Interfaces:**
- Consumes: `CursoService.listar`, `OrdemCursos`, `ORDEM_PADRAO`, `ehOrdemCursos`, `ParametrosCatalogo` (Task 2); `PerfilAlunoService.estado`, `.cursosMatriculados` (Task 3).
- Produces: `ListaCursosComponent` com inputs de query string `pagina`, `ordem`, `categoria` (strings opcionais); links `/cursos/{id}`.

- [ ] **Step 1: Testes que falham**

Reescreva `lista-cursos.spec.ts` inteiro (mantém os três casos da Fase 1 e acrescenta os novos):

```ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { EstadoPerfilAluno, PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';
import { erroInterceptor } from '../../../core/http/erro.interceptor';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { ListaCursosComponent } from './lista-cursos';

describe('ListaCursosComponent', () => {
  let backend: HttpTestingController;
  let fixture: ComponentFixture<ListaCursosComponent>;
  let router: Router;
  const notificacao = { sucesso: vi.fn(), erro: vi.fn(), info: vi.fn() };
  const estado = signal<EstadoPerfilAluno>('inativo');
  const cursosMatriculados = signal<ReadonlySet<number>>(new Set());

  const curso = (id: number, titulo: string, categoria = 'Front') => ({
    id,
    titulo,
    descricao: 'Descrição',
    categoria,
    cargaHoraria: 8,
    dataCriacao: '2026-01-01',
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
  const el = () => fixture.nativeElement as HTMLElement;
  const requisicao = () => backend.expectOne((r) => r.url === `${environment.apiUrl}/Course`);

  async function montar(entradas: Record<string, string> = {}): Promise<void> {
    fixture = TestBed.createComponent(ListaCursosComponent);
    for (const [nome, valor] of Object.entries(entradas)) fixture.componentRef.setInput(nome, valor);
    TestBed.tick();
  }

  beforeEach(async () => {
    notificacao.erro.mockReset();
    estado.set('inativo');
    cursosMatriculados.set(new Set());
    await TestBed.configureTestingModule({
      imports: [ListaCursosComponent],
      providers: [
        provideHttpClient(withInterceptors([erroInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificacaoService, useValue: notificacao },
        { provide: PerfilAlunoService, useValue: { estado, cursosMatriculados } },
      ],
    }).compileComponents();
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('mostra estado de carregamento e depois os cursos com link para o detalhe', async () => {
    await montar();
    expect(el().querySelector('[data-teste="carregando"]')).not.toBeNull();
    requisicao().flush(pagina([curso(1, 'Angular 22')], 1));
    await fixture.whenStable();
    expect(el().textContent).toContain('Angular 22');
    expect(el().textContent).toContain('8h');
    expect(el().querySelector('a[href="/cursos/1"]')).not.toBeNull();
  });

  it('mostra estado vazio', async () => {
    await montar();
    requisicao().flush(pagina([], 0));
    await fixture.whenStable();
    expect(el().textContent).toContain('Nenhum curso disponível');
  });

  it('mostra erro e permite tentar de novo', async () => {
    await montar();
    requisicao().flush({ title: 'Erro', detail: 'Falha ao listar.' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    expect(el().textContent).toContain('Não foi possível carregar os cursos');
    expect(notificacao.erro).toHaveBeenCalledWith('Falha ao listar.');
    el().querySelector<HTMLButtonElement>('button[data-teste="recarregar"]')!.click();
    TestBed.tick();
    requisicao().flush(pagina([], 0));
  });

  it('lê pagina, ordem e categoria da query string', async () => {
    await montar({ pagina: '2', ordem: 'titulo-asc', categoria: 'Back' });
    const req = requisicao();
    expect(req.request.params.get('PageNumber')).toBe('2');
    expect(req.request.params.get('SortBy')).toBe('titulo');
    expect(req.request.params.get('SortDirection')).toBe('asc');
    expect(req.request.params.get('Categoria')).toBe('Back');
    req.flush(pagina([], 0));
    await fixture.whenStable();
    expect(el().textContent).toContain('Nenhum curso na categoria Back');
    expect(el().querySelector('[data-teste="chip-categoria"]')?.textContent).toContain('Back');
  });

  it('valores inválidos na query string caem nos padrões', async () => {
    await montar({ pagina: 'abc', ordem: 'preco' });
    const req = requisicao();
    expect(req.request.params.get('PageNumber')).toBe('1');
    expect(req.request.params.get('SortBy')).toBe('datacriacao');
    req.flush(pagina([], 0));
  });

  it('mudar a ordenação navega para a página 1 com a nova ordem', async () => {
    await montar({ pagina: '3' });
    requisicao().flush(pagina([curso(1, 'A')], 40, 3));
    await fixture.whenStable();
    const select = el().querySelector<HTMLSelectElement>('select[data-teste="ordem"]')!;
    select.value = 'titulo-desc';
    select.dispatchEvent(new Event('change'));
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { ordem: 'titulo-desc', pagina: null }, queryParamsHandling: 'merge' }),
    );
  });

  it('clicar na categoria filtra e o chip limpa o filtro', async () => {
    await montar();
    requisicao().flush(pagina([curso(1, 'A', 'Dados')], 1));
    await fixture.whenStable();
    el().querySelector<HTMLButtonElement>('button[data-teste="categoria-1"]')!.click();
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { categoria: 'Dados', pagina: null }, queryParamsHandling: 'merge' }),
    );
  });

  it('o chip remove a categoria da query string', async () => {
    await montar({ categoria: 'Dados' });
    requisicao().flush(pagina([curso(1, 'A', 'Dados')], 1));
    await fixture.whenStable();
    el().querySelector<HTMLButtonElement>('[data-teste="chip-categoria"] button')!.click();
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { categoria: null, pagina: null }, queryParamsHandling: 'merge' }),
    );
  });

  it('mostra o selo Matriculado só para aluno ativo nos cursos em que está matriculado', async () => {
    estado.set('ativo');
    cursosMatriculados.set(new Set([1]));
    await montar();
    requisicao().flush(pagina([curso(1, 'A'), curso(2, 'B')], 2));
    await fixture.whenStable();
    expect(el().querySelectorAll('[data-teste="selo-matriculado"]')).toHaveLength(1);

    estado.set('pendente');
    await fixture.whenStable();
    expect(el().querySelectorAll('[data-teste="selo-matriculado"]')).toHaveLength(0);
  });

  it('os botões de página navegam pela query string', async () => {
    await montar();
    requisicao().flush(pagina([curso(1, 'A')], 30, 1));
    await fixture.whenStable();
    el().querySelector<HTMLButtonElement>('button[data-teste="proxima"]')!.click();
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { pagina: 2 }, queryParamsHandling: 'merge' }),
    );
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --watch=false --include "**/lista-cursos.spec.ts"`
Expected: FAIL (inputs, select, chip e selo não existem).

- [ ] **Step 3: Implementar**

`lista-cursos.ts`:

```ts
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';
import {
  CursoService,
  ORDEM_PADRAO,
  OrdemCursos,
  ParametrosCatalogo,
  ehOrdemCursos,
} from '../../../core/api/curso.service';

const TAMANHO_PAGINA = 12;

export const OPCOES_DE_ORDEM: { valor: OrdemCursos; rotulo: string }[] = [
  { valor: 'recentes', rotulo: 'Mais recentes' },
  { valor: 'titulo-asc', rotulo: 'Título A–Z' },
  { valor: 'titulo-desc', rotulo: 'Título Z–A' },
  { valor: 'categoria', rotulo: 'Categoria' },
];

function paginaValida(valor: string | undefined): number {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : 1;
}

@Component({
  selector: 'app-lista-cursos',
  imports: [RouterLink, HlmButtonImports, HlmCardImports, HlmSkeletonImports],
  templateUrl: './lista-cursos.html',
})
export class ListaCursosComponent {
  private readonly cursoService = inject(CursoService);
  private readonly router = inject(Router);
  private readonly perfilAluno = inject(PerfilAlunoService);

  readonly pagina = input<string>();
  readonly ordem = input<string>();
  readonly categoria = input<string>();

  protected readonly opcoesDeOrdem = OPCOES_DE_ORDEM;
  protected readonly ordemAtual = computed<OrdemCursos>(() => {
    const ordem = this.ordem();
    return ehOrdemCursos(ordem) ? ordem : ORDEM_PADRAO;
  });
  protected readonly categoriaAtual = computed(() => this.categoria()?.trim() || null);
  protected readonly parametros = computed<ParametrosCatalogo>(() => ({
    pagina: paginaValida(this.pagina()),
    tamanho: TAMANHO_PAGINA,
    ordem: this.ordemAtual(),
    categoria: this.categoriaAtual(),
  }));
  protected readonly cursos = this.cursoService.listar(this.parametros);
  protected readonly esqueletos = Array.from({ length: 6 });
  protected readonly mostraSeloMatriculado = computed(() => this.perfilAluno.estado() === 'ativo');
  protected readonly cursosMatriculados = this.perfilAluno.cursosMatriculados;

  protected irPara(pagina: number): void {
    void this.router.navigate([], { queryParams: { pagina }, queryParamsHandling: 'merge' });
  }

  protected mudarOrdem(evento: Event): void {
    const ordem = (evento.target as HTMLSelectElement).value;
    void this.router.navigate([], {
      queryParams: { ordem, pagina: null },
      queryParamsHandling: 'merge',
    });
  }

  protected filtrarPorCategoria(categoria: string | null): void {
    void this.router.navigate([], {
      queryParams: { categoria, pagina: null },
      queryParamsHandling: 'merge',
    });
  }

  protected recarregar(): void {
    this.cursos.reload();
  }
}
```

`lista-cursos.html` — substitua o conteúdo por:

```html
<div class="flex flex-col gap-6">
  <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 class="text-2xl font-semibold">Cursos</h1>
      <p class="text-muted-foreground">Catálogo disponível para matrícula.</p>
    </div>
    <label class="flex flex-col gap-1 text-sm">
      <span class="text-muted-foreground">Ordenar por</span>
      <select
        data-teste="ordem"
        class="h-9 rounded-md border border-input bg-background px-3 text-sm"
        [value]="ordemAtual()"
        (change)="mudarOrdem($event)"
      >
        @for (opcao of opcoesDeOrdem; track opcao.valor) {
          <option [value]="opcao.valor" [selected]="opcao.valor === ordemAtual()">{{ opcao.rotulo }}</option>
        }
      </select>
    </label>
  </header>

  @if (categoriaAtual(); as categoria) {
    <div data-teste="chip-categoria" class="flex items-center gap-2 self-start rounded-full border border-border px-3 py-1 text-sm">
      <span>Categoria: {{ categoria }}</span>
      <button type="button" class="text-muted-foreground hover:text-foreground" aria-label="Limpar filtro de categoria" (click)="filtrarPorCategoria(null)">×</button>
    </div>
  }

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
      <p class="py-8 text-center text-muted-foreground">
        @if (categoriaAtual(); as categoria) {
          Nenhum curso na categoria {{ categoria }}.
        } @else {
          Nenhum curso disponível no momento.
        }
      </p>
    } @else {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (curso of pagina.items; track curso.id) {
          <article hlmCard>
            <div hlmCardHeader>
              <h2 hlmCardTitle>
                <a [routerLink]="['/cursos', curso.id]" class="hover:underline">{{ curso.titulo }}</a>
              </h2>
              <p hlmCardDescription class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="underline-offset-2 hover:underline"
                  [attr.data-teste]="'categoria-' + curso.id"
                  (click)="filtrarPorCategoria(curso.categoria)"
                >
                  {{ curso.categoria }}
                </button>
                <span>· {{ curso.cargaHoraria }}h</span>
                @if (mostraSeloMatriculado() && cursosMatriculados().has(curso.id)) {
                  <span data-teste="selo-matriculado" class="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">Matriculado</span>
                }
              </p>
            </div>
            <div hlmCardContent>
              <p class="line-clamp-3 text-sm text-muted-foreground">{{ curso.descricao }}</p>
            </div>
          </article>
        }
      </div>

      <nav class="flex items-center justify-center gap-4" aria-label="Paginação">
        <button hlmBtn variant="outline" size="sm" type="button" data-teste="anterior" [disabled]="!pagina.hasPreviousPage" (click)="irPara(pagina.pageNumber - 1)">
          Anterior
        </button>
        <span class="text-sm text-muted-foreground">Página {{ pagina.pageNumber }} de {{ pagina.totalPages }}</span>
        <button hlmBtn variant="outline" size="sm" type="button" data-teste="proxima" [disabled]="!pagina.hasNextPage" (click)="irPara(pagina.pageNumber + 1)">
          Próxima
        </button>
      </nav>
    }
  }
</div>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- --watch=false --include "**/lista-cursos.spec.ts"`. Expected: PASS. Rode também `app.routes.spec.ts` (o catálogo agora injeta `PerfilAlunoService`, que usa o mock de `AutenticacaoService` daquele spec — ele já tem `role`).

- [ ] **Step 5: Verificar e commit**

```bash
npm run format && npm run lint && npm test -- --watch=false && npx ng build
git add src/app/features/catalogo/lista-cursos
git commit -m "feat: catalogo com ordenacao, filtro por categoria, selo de matricula e link para o detalhe"
```

---

### Task 5: Detalhe do curso e matrícula

**Files:**
- Create: `src/app/features/catalogo/detalhe-curso/detalhe-curso.ts`, `.html`, `.spec.ts`
- Modify: `src/app/features/catalogo/catalogo.routes.ts`

**Interfaces:**
- Consumes: `CursoService.obter` (Task 2); `MatriculaService.matricular` (Task 2); `PerfilAlunoService.estado`, `.perfil`, `.cursosMatriculados`, `.recarregarMatriculas` (Task 3); `AutenticacaoService.role`; `NotificacaoService.sucesso`; `extrairErroApi` (Task 3).
- Produces: rota `cursos/:id` → `DetalheCursoComponent` (input `id: string`).

- [ ] **Step 1: Teste que falha**

`detalhe-curso.spec.ts`:

```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { EstadoPerfilAluno, PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';
import { PerfilAluno } from '../../../core/api/modelos/aluno';
import { MatriculaService } from '../../../core/api/matricula.service';
import { AutenticacaoService } from '../../../core/auth/autenticacao.service';
import { Role } from '../../../core/auth/jwt';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { DetalheCursoComponent } from './detalhe-curso';

describe('DetalheCursoComponent', () => {
  let backend: HttpTestingController;
  let fixture: ComponentFixture<DetalheCursoComponent>;
  const role = signal<Role | null>('Student');
  const estado = signal<EstadoPerfilAluno>('ativo');
  const perfil = signal<PerfilAluno | null>({ id: 9, nome: 'Aluno', email: 'a@t.dev', dataCadastro: '2026-01-01' });
  const cursosMatriculados = signal<ReadonlySet<number>>(new Set());
  const perfilAluno = { estado, perfil, cursosMatriculados, recarregarMatriculas: vi.fn() };
  const matriculaService = { matricular: vi.fn<(c: number, s: number) => Promise<void>>() };
  const notificacao = { sucesso: vi.fn(), erro: vi.fn(), info: vi.fn() };
  const curso = { id: 5, titulo: 'Curso Cinco', descricao: 'Descrição longa', categoria: 'Tech', cargaHoraria: 12, dataCriacao: '2026-03-10T00:00:00Z' };
  const el = () => fixture.nativeElement as HTMLElement;

  async function montar(id = '5', responder = true): Promise<void> {
    fixture = TestBed.createComponent(DetalheCursoComponent);
    fixture.componentRef.setInput('id', id);
    TestBed.tick();
    if (responder) {
      backend.expectOne(`${environment.apiUrl}/Course/${id}`).flush(curso);
      await fixture.whenStable();
    }
  }

  beforeEach(async () => {
    role.set('Student');
    estado.set('ativo');
    cursosMatriculados.set(new Set());
    perfilAluno.recarregarMatriculas.mockReset();
    matriculaService.matricular.mockReset();
    notificacao.sucesso.mockReset();
    await TestBed.configureTestingModule({
      imports: [DetalheCursoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AutenticacaoService, useValue: { role } },
        { provide: PerfilAlunoService, useValue: perfilAluno },
        { provide: MatriculaService, useValue: matriculaService },
        { provide: NotificacaoService, useValue: notificacao },
      ],
    }).compileComponents();
    backend = TestBed.inject(HttpTestingController);
  });

  it('mostra os dados do curso', async () => {
    await montar();
    expect(el().querySelector('h1')?.textContent).toContain('Curso Cinco');
    expect(el().textContent).toContain('12h');
    expect(el().textContent).toContain('10/03/2026');
    expect(el().querySelector('a[href="/cursos?categoria=Tech"]')).not.toBeNull();
  });

  it('aluno ativo e não matriculado se matricula', async () => {
    matriculaService.matricular.mockResolvedValue();
    await montar();
    el().querySelector<HTMLButtonElement>('button[data-teste="matricular"]')!.click();
    await fixture.whenStable();
    expect(matriculaService.matricular).toHaveBeenCalledWith(5, 9);
    expect(notificacao.sucesso).toHaveBeenCalledWith('Matrícula realizada');
    expect(perfilAluno.recarregarMatriculas).toHaveBeenCalled();
  });

  it('falha na matrícula reabilita o botão e não recarrega', async () => {
    matriculaService.matricular.mockRejectedValue({ status: 409, titulo: 'Conflito', detalhe: 'Já matriculado.' });
    await montar();
    const botao = el().querySelector<HTMLButtonElement>('button[data-teste="matricular"]')!;
    botao.click();
    await fixture.whenStable();
    expect(perfilAluno.recarregarMatriculas).not.toHaveBeenCalled();
    expect(botao.disabled).toBe(false);
  });

  it('aluno já matriculado vê o selo e o link para Meus cursos', async () => {
    cursosMatriculados.set(new Set([5]));
    await montar();
    expect(el().querySelector('button[data-teste="matricular"]')).toBeNull();
    expect(el().textContent).toContain('Você está matriculado');
    expect(el().querySelector('a[href="/aluno/matriculas"]')).not.toBeNull();
  });

  it('perfil pendente desabilita a matrícula e explica', async () => {
    estado.set('pendente');
    await montar();
    expect(el().querySelector<HTMLButtonElement>('button[data-teste="matricular"]')!.disabled).toBe(true);
    expect(el().textContent).toContain('aguardando liberação por um administrador');
  });

  it('Admin não vê área de matrícula', async () => {
    role.set('Admin');
    estado.set('inativo');
    await montar();
    expect(el().querySelector('[data-teste="area-matricula"]')).toBeNull();
  });

  it('404 mostra Curso não encontrado', async () => {
    await montar('77', false);
    backend.expectOne(`${environment.apiUrl}/Course/77`).flush({ title: 'Não encontrado', detail: 'x' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    expect(el().textContent).toContain('Curso não encontrado');
  });

  it('id inválido mostra Curso não encontrado sem chamar a API', async () => {
    await montar('abc', false);
    backend.expectNone(() => true);
    await fixture.whenStable();
    expect(el().textContent).toContain('Curso não encontrado');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --watch=false --include "**/detalhe-curso.spec.ts"`. Expected: FAIL (componente não existe).

- [ ] **Step 3: Implementar**

`detalhe-curso.ts`:

```ts
import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';
import { CursoService } from '../../../core/api/curso.service';
import { MatriculaService } from '../../../core/api/matricula.service';
import { AutenticacaoService } from '../../../core/auth/autenticacao.service';
import { extrairErroApi } from '../../../core/http/erro-api';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';

@Component({
  selector: 'app-detalhe-curso',
  imports: [DatePipe, RouterLink, HlmButtonImports, HlmCardImports, HlmSkeletonImports],
  templateUrl: './detalhe-curso.html',
})
export class DetalheCursoComponent {
  private readonly cursoService = inject(CursoService);
  private readonly matriculaService = inject(MatriculaService);
  private readonly notificacao = inject(NotificacaoService);
  private readonly auth = inject(AutenticacaoService);
  protected readonly perfilAluno = inject(PerfilAlunoService);

  readonly id = input.required<string>();

  protected readonly idDoCurso = computed(() => {
    const numero = Number(this.id());
    return Number.isInteger(numero) && numero > 0 ? numero : null;
  });
  protected readonly curso = this.cursoService.obter(this.idDoCurso);
  protected readonly naoEncontrado = computed(
    () => this.idDoCurso() === null || extrairErroApi(this.curso.error())?.status === 404,
  );
  protected readonly ehAluno = computed(() => this.auth.role() === 'Student');
  protected readonly jaMatriculado = computed(() => {
    const id = this.idDoCurso();
    return id !== null && this.perfilAluno.cursosMatriculados().has(id);
  });
  protected readonly enviando = signal(false);

  protected async matricular(): Promise<void> {
    const cursoId = this.idDoCurso();
    const perfil = this.perfilAluno.perfil();
    if (cursoId === null || !perfil || this.enviando()) return;
    this.enviando.set(true);
    try {
      await this.matriculaService.matricular(cursoId, perfil.id);
      this.notificacao.sucesso('Matrícula realizada');
      this.perfilAluno.recarregarMatriculas();
    } catch {
      // o erroInterceptor já mostrou o toast com a mensagem da API
    } finally {
      this.enviando.set(false);
    }
  }
}
```

`detalhe-curso.html`:

```html
<div class="flex flex-col gap-6">
  <a routerLink="/cursos" class="self-start text-sm text-muted-foreground hover:underline">← Voltar ao catálogo</a>

  @if (naoEncontrado()) {
    <section hlmCard class="items-center text-center">
      <div hlmCardContent class="flex flex-col items-center gap-3 py-8">
        <h1 class="text-xl font-semibold">Curso não encontrado</h1>
        <a hlmBtn variant="outline" routerLink="/cursos">Ver catálogo</a>
      </div>
    </section>
  } @else if (curso.isLoading()) {
    <hlm-skeleton class="h-48 w-full" />
  } @else if (curso.error()) {
    <p class="text-destructive">Não foi possível carregar o curso.</p>
  } @else if (curso.value(); as dados) {
    <article hlmCard>
      <div hlmCardHeader>
        <h1 hlmCardTitle class="text-2xl">{{ dados.titulo }}</h1>
        <p hlmCardDescription class="flex flex-wrap gap-2">
          <a [routerLink]="['/cursos']" [queryParams]="{ categoria: dados.categoria }" class="hover:underline">{{ dados.categoria }}</a>
          <span>· {{ dados.cargaHoraria }}h</span>
          <span>· criado em {{ dados.dataCriacao | date: 'dd/MM/yyyy' }}</span>
        </p>
      </div>
      <div hlmCardContent>
        <p class="whitespace-pre-line">{{ dados.descricao }}</p>
      </div>

      @if (ehAluno()) {
        <div hlmCardFooter data-teste="area-matricula" class="flex flex-col items-start gap-2">
          @if (jaMatriculado()) {
            <span class="rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground">Você está matriculado</span>
            <a routerLink="/aluno/matriculas" class="text-sm underline">Ver meus cursos</a>
          } @else {
            <button
              hlmBtn
              type="button"
              data-teste="matricular"
              [disabled]="perfilAluno.estado() !== 'ativo' || enviando()"
              (click)="matricular()"
            >
              {{ enviando() ? 'Matriculando...' : 'Matricular-me' }}
            </button>
            @if (perfilAluno.estado() === 'pendente') {
              <p class="text-sm text-muted-foreground">Seu cadastro está aguardando liberação por um administrador.</p>
            }
          }
        </div>
      }
    </article>
  }
</div>
```

`catalogo.routes.ts`:

```ts
import { Routes } from '@angular/router';
import { DetalheCursoComponent } from './detalhe-curso/detalhe-curso';
import { ListaCursosComponent } from './lista-cursos/lista-cursos';

export const CATALOGO_ROUTES: Routes = [
  { path: '', component: ListaCursosComponent },
  { path: ':id', component: DetalheCursoComponent },
];
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- --watch=false --include "**/detalhe-curso.spec.ts"`. Expected: PASS.

Se o `hlmCardFooter` não existir no helm instalado, use um `<div>` com as mesmas classes e `border-t border-border pt-4`.

- [ ] **Step 5: Verificar e commit**

```bash
npm run format && npm run lint && npm test -- --watch=false && npx ng build
git add src/app/features/catalogo
git commit -m "feat: detalhe do curso com matricula do aluno"
```

---

### Task 6: Área do aluno, "Meus cursos" e link no shell

**Files:**
- Create: `src/app/features/aluno/aluno-layout/aluno-layout.ts`, `.html`, `.spec.ts`
- Create: `src/app/features/aluno/meus-cursos/meus-cursos.ts`, `.html`, `.spec.ts`
- Modify: `src/app/features/aluno/aluno.routes.ts`
- Modify: `src/app/core/layout/shell/shell.ts`, `shell.spec.ts`
- Modify: `src/app/app.routes.spec.ts`

**Interfaces:**
- Consumes: `PerfilAlunoService` (Task 3).
- Produces: `ALUNO_ROUTES` = `''` → `AlunoLayoutComponent` com filhos `''` → redirect `matriculas`, `matriculas` → `MeusCursosComponent` (Tasks 7 e 8 acrescentam `pagamentos` e `perfil`). Shell: aluno ganha o link `{ rota: '/aluno/matriculas', rotulo: 'Meus cursos' }`.

- [ ] **Step 1: Testes que falham**

`aluno-layout.spec.ts`:

```ts
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EstadoPerfilAluno, PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';
import { AlunoLayoutComponent } from './aluno-layout';

describe('AlunoLayoutComponent', () => {
  const estado = signal<EstadoPerfilAluno>('carregando');
  const perfilAluno = { estado, recarregarPerfil: vi.fn() };
  let fixture: ComponentFixture<AlunoLayoutComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    perfilAluno.recarregarPerfil.mockReset();
    await TestBed.configureTestingModule({
      imports: [AlunoLayoutComponent],
      providers: [provideRouter([]), { provide: PerfilAlunoService, useValue: perfilAluno }],
    }).compileComponents();
    fixture = TestBed.createComponent(AlunoLayoutComponent);
  });

  it('carregando mostra esqueleto', async () => {
    estado.set('carregando');
    await fixture.whenStable();
    expect(el().querySelector('[data-teste="carregando"]')).not.toBeNull();
  });

  it('pendente mostra o aviso e o link para o catálogo', async () => {
    estado.set('pendente');
    await fixture.whenStable();
    expect(el().textContent).toContain('Seu cadastro está aguardando liberação por um administrador');
    expect(el().querySelector('a[href="/cursos"]')).not.toBeNull();
    expect(el().querySelector('router-outlet')).toBeNull();
  });

  it('erro permite tentar de novo', async () => {
    estado.set('erro');
    await fixture.whenStable();
    expect(el().textContent).toContain('Não foi possível carregar seu perfil');
    el().querySelector<HTMLButtonElement>('button[data-teste="recarregar"]')!.click();
    expect(perfilAluno.recarregarPerfil).toHaveBeenCalled();
  });

  it('ativo mostra o conteúdo', async () => {
    estado.set('ativo');
    await fixture.whenStable();
    expect(el().querySelector('router-outlet')).not.toBeNull();
  });
});
```

`meus-cursos.spec.ts`:

```ts
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';
import { MatriculaAluno } from '../../../core/api/modelos/aluno';
import { MeusCursosComponent } from './meus-cursos';

describe('MeusCursosComponent', () => {
  const carregando = signal(false);
  const erro = signal<unknown>(undefined);
  const valor = signal<MatriculaAluno[] | undefined>(undefined);
  const perfilAluno = {
    matriculasRecurso: { isLoading: carregando, error: erro, value: valor },
    recarregarMatriculas: vi.fn(),
  };
  let fixture: ComponentFixture<MeusCursosComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    carregando.set(false);
    erro.set(undefined);
    valor.set(undefined);
    perfilAluno.recarregarMatriculas.mockReset();
    await TestBed.configureTestingModule({
      imports: [MeusCursosComponent],
      providers: [provideRouter([]), { provide: PerfilAlunoService, useValue: perfilAluno }],
    }).compileComponents();
    fixture = TestBed.createComponent(MeusCursosComponent);
  });

  it('lista as matrículas com link e selo de situação', async () => {
    valor.set([
      { courseId: 1, titulo: 'Curso A', descricao: 'd', categoria: 'Front', matriculaAtiva: true, enrollmentId: 10 },
      { courseId: 2, titulo: 'Curso B', descricao: 'd', categoria: 'Back', matriculaAtiva: false, enrollmentId: 11 },
    ]);
    await fixture.whenStable();
    expect(el().querySelector('h1')?.textContent).toContain('Meus cursos');
    expect(el().querySelector('a[href="/cursos/1"]')?.textContent).toContain('Curso A');
    expect(el().textContent).toContain('Ativa');
    expect(el().textContent).toContain('Inativa');
  });

  it('vazio mostra mensagem e link para o catálogo', async () => {
    valor.set([]);
    await fixture.whenStable();
    expect(el().textContent).toContain('Você ainda não está matriculado em nenhum curso');
    expect(el().querySelector('a[href="/cursos"]')).not.toBeNull();
  });

  it('carregando mostra esqueleto', async () => {
    carregando.set(true);
    await fixture.whenStable();
    expect(el().querySelector('[data-teste="carregando"]')).not.toBeNull();
  });

  it('erro permite tentar de novo', async () => {
    erro.set(new Error('falhou'));
    await fixture.whenStable();
    el().querySelector<HTMLButtonElement>('button[data-teste="recarregar"]')!.click();
    expect(perfilAluno.recarregarMatriculas).toHaveBeenCalled();
  });
});
```

Em `shell.spec.ts`, acrescente (o arquivo já monta o shell com `role` mockado; siga o padrão dele):

```ts
  it('aluno vê o link Meus cursos', async () => {
    role.set('Student');
    const fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/aluno/matriculas"]')).not.toBeNull();
  });
```

(Se o sinal de role do spec tiver outro nome, use o existente; zere-o para o valor inicial no `beforeEach` se ainda não for zerado.)

Em `app.routes.spec.ts`, acrescente:

```ts
  it('Student em /aluno vai para /aluno/matriculas', async () => {
    autenticarComo('Student');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/aluno');
    expect(TestBed.inject(Router).url).toBe('/aluno/matriculas');
  });

  it('/cursos/1 abre o detalhe do curso', async () => {
    autenticarComo('Student');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/cursos/1');
    expect(TestBed.inject(Router).url).toBe('/cursos/1');
    expect(harness.routeNativeElement?.textContent).toContain('Voltar ao catálogo');
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --watch=false --include "**/aluno-layout.spec.ts" --include "**/meus-cursos.spec.ts" --include "**/shell.spec.ts" --include "**/app.routes.spec.ts"`. Expected: FAIL.

- [ ] **Step 3: Implementar**

`aluno-layout.ts`:

```ts
import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';

@Component({
  selector: 'app-aluno-layout',
  imports: [RouterOutlet, RouterLink, HlmButtonImports, HlmCardImports, HlmSkeletonImports],
  templateUrl: './aluno-layout.html',
})
export class AlunoLayoutComponent {
  protected readonly perfilAluno = inject(PerfilAlunoService);
}
```

`aluno-layout.html`:

```html
@switch (perfilAluno.estado()) {
  @case ('ativo') {
    <router-outlet />
  }
  @case ('pendente') {
    <section hlmCard>
      <div hlmCardContent class="flex flex-col gap-3 py-6">
        <p>
          Seu cadastro está aguardando liberação por um administrador. Enquanto isso, você pode navegar
          pelo catálogo.
        </p>
        <a hlmBtn variant="outline" routerLink="/cursos" class="self-start">Ver catálogo</a>
      </div>
    </section>
  }
  @case ('erro') {
    <section hlmCard>
      <div hlmCardContent class="flex flex-col gap-3 py-6">
        <p class="text-destructive">Não foi possível carregar seu perfil.</p>
        <button hlmBtn variant="outline" type="button" data-teste="recarregar" class="self-start" (click)="perfilAluno.recarregarPerfil()">
          Tentar novamente
        </button>
      </div>
    </section>
  }
  @default {
    <div data-teste="carregando" class="flex flex-col gap-3">
      <hlm-skeleton class="h-8 w-48" />
      <hlm-skeleton class="h-32 w-full" />
    </div>
  }
}
```

`meus-cursos.ts`:

```ts
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';

@Component({
  selector: 'app-meus-cursos',
  imports: [RouterLink, HlmButtonImports, HlmCardImports, HlmSkeletonImports],
  templateUrl: './meus-cursos.html',
})
export class MeusCursosComponent {
  protected readonly perfilAluno = inject(PerfilAlunoService);
  protected readonly matriculas = this.perfilAluno.matriculasRecurso;
}
```

`meus-cursos.html`:

```html
<div class="flex flex-col gap-6">
  <h1 class="text-2xl font-semibold">Meus cursos</h1>

  @if (matriculas.isLoading()) {
    <div data-teste="carregando" class="grid gap-4 sm:grid-cols-2">
      <hlm-skeleton class="h-28 w-full" />
      <hlm-skeleton class="h-28 w-full" />
    </div>
  } @else if (matriculas.error()) {
    <div class="flex flex-col items-start gap-3">
      <p class="text-destructive">Não foi possível carregar seus cursos.</p>
      <button hlmBtn variant="outline" type="button" data-teste="recarregar" (click)="perfilAluno.recarregarMatriculas()">
        Tentar novamente
      </button>
    </div>
  } @else if (matriculas.value(); as lista) {
    @if (lista.length === 0) {
      <div class="flex flex-col items-start gap-3">
        <p class="text-muted-foreground">Você ainda não está matriculado em nenhum curso.</p>
        <a hlmBtn variant="outline" routerLink="/cursos">Ver catálogo</a>
      </div>
    } @else {
      <div class="grid gap-4 sm:grid-cols-2">
        @for (matricula of lista; track matricula.enrollmentId) {
          <article hlmCard>
            <div hlmCardHeader>
              <h2 hlmCardTitle>
                <a [routerLink]="['/cursos', matricula.courseId]" class="hover:underline">{{ matricula.titulo }}</a>
              </h2>
              <p hlmCardDescription class="flex items-center gap-2">
                <span>{{ matricula.categoria }}</span>
                @if (matricula.matriculaAtiva) {
                  <span class="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">Ativa</span>
                } @else {
                  <span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Inativa</span>
                }
              </p>
            </div>
            <div hlmCardContent>
              <p class="line-clamp-3 text-sm text-muted-foreground">{{ matricula.descricao }}</p>
            </div>
          </article>
        }
      </div>
    }
  }
</div>
```

`aluno.routes.ts`:

```ts
import { Routes } from '@angular/router';
import { AlunoLayoutComponent } from './aluno-layout/aluno-layout';
import { MeusCursosComponent } from './meus-cursos/meus-cursos';

export const ALUNO_ROUTES: Routes = [
  {
    path: '',
    component: AlunoLayoutComponent,
    children: [
      { path: '', redirectTo: 'matriculas', pathMatch: 'full' },
      { path: 'matriculas', component: MeusCursosComponent },
    ],
  },
];
```

`shell.ts` — no `computed` de `links`, depois da linha de Admin/Instructor:

```ts
    if (role === 'Student') base.push({ rota: '/aluno/matriculas', rotulo: 'Meus cursos' });
```

- [ ] **Step 4: Rodar e ver passar**

Run: o mesmo do Step 2. Expected: PASS.

- [ ] **Step 5: Verificar e commit**

```bash
npm run format && npm run lint && npm test -- --watch=false && npx ng build
git add src/app/features/aluno src/app/core/layout/shell src/app/app.routes.spec.ts
git commit -m "feat: area do aluno com aviso de perfil pendente e meus cursos"
```

---

### Task 7: Meus pagamentos

**Files:**
- Create: `src/app/features/aluno/meus-pagamentos/meus-pagamentos.ts`, `.html`, `.spec.ts`
- Modify: `src/app/features/aluno/aluno.routes.ts`, `src/app/core/layout/shell/shell.ts`, `shell.spec.ts`

**Interfaces:**
- Consumes: `PagamentoService.listarDoAluno` (Task 2); `PerfilAlunoService.perfil` (Task 3); `Pagamento`, `StatusPagamento` (Task 2).
- Produces: rota `pagamentos` → `MeusPagamentosComponent` (input `pagina: string`); `ROTULOS_STATUS: Record<StatusPagamento, string>`; link do shell `{ rota: '/aluno/pagamentos', rotulo: 'Pagamentos' }`.

- [ ] **Step 1: Teste que falha**

`meus-pagamentos.spec.ts`:

```ts
import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localePt from '@angular/common/locales/pt';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';
import { PerfilAluno } from '../../../core/api/modelos/aluno';
import { MeusPagamentosComponent } from './meus-pagamentos';

registerLocaleData(localePt, 'pt-BR');

describe('MeusPagamentosComponent', () => {
  let backend: HttpTestingController;
  let fixture: ComponentFixture<MeusPagamentosComponent>;
  let router: Router;
  const perfil = signal<PerfilAluno | null>({ id: 4, nome: 'A', email: 'a@t.dev', dataCadastro: '2026-01-01' });
  const el = () => fixture.nativeElement as HTMLElement;
  const pagamento = (paymentId: number, status: string, paidAt: string | null) => ({
    paymentId,
    enrollmentId: 20,
    studentId: 4,
    amount: 1234.5,
    status,
    isActive: true,
    createdAt: '2026-09-01T12:00:00Z',
    paidAt,
    externalTransactionId: null,
    courseId: 7,
    courseTitulo: 'Curso Sete',
  });
  const pagina = (itens: object[], totalCount: number, pageNumber = 1) => ({
    items: itens, pageNumber, pageSize: 10, totalCount,
    totalPages: Math.ceil(totalCount / 10), hasPreviousPage: pageNumber > 1, hasNextPage: pageNumber * 10 < totalCount,
  });
  const requisicao = () => backend.expectOne((r) => r.url === `${environment.apiUrl}/Payment/student/4`);

  async function montar(entradas: Record<string, string> = {}): Promise<void> {
    fixture = TestBed.createComponent(MeusPagamentosComponent);
    for (const [nome, valor] of Object.entries(entradas)) fixture.componentRef.setInput(nome, valor);
    TestBed.tick();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeusPagamentosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
        { provide: PerfilAlunoService, useValue: { perfil } },
      ],
    }).compileComponents();
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('lista pagamentos com curso, valor, status e datas em pt-BR', async () => {
    await montar();
    requisicao().flush(pagina([pagamento(1, 'Paid', '2026-09-02T12:00:00Z'), pagamento(2, 'Pending', null)], 2));
    await fixture.whenStable();
    const texto = el().textContent ?? '';
    expect(el().querySelector('a[href="/cursos/7"]')?.textContent).toContain('Curso Sete');
    expect(texto).toContain('R$');
    expect(texto).toContain('1.234,50');
    expect(texto).toContain('Pago');
    expect(texto).toContain('Pendente');
    expect(texto).toContain('01/09/2026');
    expect(texto).toContain('—');
  });

  it('traduz Failed e Refunded', async () => {
    await montar();
    requisicao().flush(pagina([pagamento(1, 'Failed', null), pagamento(2, 'Refunded', null)], 2));
    await fixture.whenStable();
    expect(el().textContent).toContain('Falhou');
    expect(el().textContent).toContain('Estornado');
  });

  it('vazio mostra Nenhum pagamento registrado.', async () => {
    await montar();
    requisicao().flush(pagina([], 0));
    await fixture.whenStable();
    expect(el().textContent).toContain('Nenhum pagamento registrado.');
  });

  it('usa a página da query string e navega para a próxima', async () => {
    await montar({ pagina: '2' });
    const req = requisicao();
    expect(req.request.params.get('PageNumber')).toBe('2');
    expect(req.request.params.get('PageSize')).toBe('10');
    req.flush(pagina([pagamento(1, 'Paid', null)], 25, 2));
    await fixture.whenStable();
    el().querySelector<HTMLButtonElement>('button[data-teste="proxima"]')!.click();
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { pagina: 3 }, queryParamsHandling: 'merge' }),
    );
  });

  it('erro permite tentar de novo', async () => {
    await montar();
    requisicao().flush({ detail: 'x' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    expect(el().textContent).toContain('Não foi possível carregar seus pagamentos');
    el().querySelector<HTMLButtonElement>('button[data-teste="recarregar"]')!.click();
    TestBed.tick();
    requisicao().flush(pagina([], 0));
  });
});
```

E em `shell.spec.ts`: o teste "aluno vê o link Meus cursos" também passa a checar `a[href="/aluno/pagamentos"]` (acrescente a asserção).

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --watch=false --include "**/meus-pagamentos.spec.ts" --include "**/shell.spec.ts"`. Expected: FAIL.

- [ ] **Step 3: Implementar**

`meus-pagamentos.ts`:

```ts
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';
import { StatusPagamento } from '../../../core/api/modelos/pagamento';
import { ParametrosPaginacao } from '../../../core/api/modelos/paginacao';
import { PagamentoService } from '../../../core/api/pagamento.service';

const TAMANHO_PAGINA = 10;

export const ROTULOS_STATUS: Record<StatusPagamento, string> = {
  Pending: 'Pendente',
  Paid: 'Pago',
  Failed: 'Falhou',
  Refunded: 'Estornado',
};

const CLASSES_STATUS: Record<StatusPagamento, string> = {
  Pending: 'bg-muted text-muted-foreground',
  Paid: 'bg-primary text-primary-foreground',
  Failed: 'bg-destructive/10 text-destructive',
  Refunded: 'bg-secondary text-secondary-foreground',
};

@Component({
  selector: 'app-meus-pagamentos',
  imports: [CurrencyPipe, DatePipe, RouterLink, HlmButtonImports, HlmSkeletonImports],
  templateUrl: './meus-pagamentos.html',
})
export class MeusPagamentosComponent {
  private readonly pagamentoService = inject(PagamentoService);
  private readonly perfilAluno = inject(PerfilAlunoService);
  private readonly router = inject(Router);

  readonly pagina = input<string>();

  protected readonly rotulos = ROTULOS_STATUS;
  protected readonly classes = CLASSES_STATUS;
  private readonly studentId = computed(() => this.perfilAluno.perfil()?.id ?? null);
  private readonly parametros = computed<ParametrosPaginacao>(() => {
    const numero = Number(this.pagina());
    return { pagina: Number.isInteger(numero) && numero > 0 ? numero : 1, tamanho: TAMANHO_PAGINA };
  });
  protected readonly pagamentos = this.pagamentoService.listarDoAluno(this.studentId, this.parametros);

  protected irPara(pagina: number): void {
    void this.router.navigate([], { queryParams: { pagina }, queryParamsHandling: 'merge' });
  }

  protected recarregar(): void {
    this.pagamentos.reload();
  }
}
```

`meus-pagamentos.html`:

```html
<div class="flex flex-col gap-6">
  <h1 class="text-2xl font-semibold">Meus pagamentos</h1>

  @if (pagamentos.isLoading()) {
    <hlm-skeleton data-teste="carregando" class="h-40 w-full" />
  } @else if (pagamentos.error()) {
    <div class="flex flex-col items-start gap-3">
      <p class="text-destructive">Não foi possível carregar seus pagamentos.</p>
      <button hlmBtn variant="outline" type="button" data-teste="recarregar" (click)="recarregar()">Tentar novamente</button>
    </div>
  } @else if (pagamentos.value(); as pagina) {
    @if (pagina.items.length === 0) {
      <p class="text-muted-foreground">Nenhum pagamento registrado.</p>
    } @else {
      <table class="hidden w-full text-left text-sm sm:table">
        <thead class="border-b border-border text-muted-foreground">
          <tr>
            <th class="py-2 font-medium">Curso</th>
            <th class="py-2 font-medium">Valor</th>
            <th class="py-2 font-medium">Status</th>
            <th class="py-2 font-medium">Criado em</th>
            <th class="py-2 font-medium">Pago em</th>
          </tr>
        </thead>
        <tbody>
          @for (item of pagina.items; track item.paymentId) {
            <tr class="border-b border-border">
              <td class="py-2"><a [routerLink]="['/cursos', item.courseId]" class="hover:underline">{{ item.courseTitulo }}</a></td>
              <td class="py-2">{{ item.amount | currency }}</td>
              <td class="py-2"><span class="rounded-full px-2 py-0.5 text-xs" [class]="classes[item.status]">{{ rotulos[item.status] }}</span></td>
              <td class="py-2">{{ item.createdAt | date: 'dd/MM/yyyy' }}</td>
              <td class="py-2">{{ item.paidAt ? (item.paidAt | date: 'dd/MM/yyyy') : '—' }}</td>
            </tr>
          }
        </tbody>
      </table>

      <ul class="flex flex-col gap-3 sm:hidden">
        @for (item of pagina.items; track item.paymentId) {
          <li class="rounded-lg border border-border p-3 text-sm">
            <a [routerLink]="['/cursos', item.courseId]" class="font-medium hover:underline">{{ item.courseTitulo }}</a>
            <div class="mt-1 flex items-center justify-between">
              <span>{{ item.amount | currency }}</span>
              <span class="rounded-full px-2 py-0.5 text-xs" [class]="classes[item.status]">{{ rotulos[item.status] }}</span>
            </div>
            <p class="mt-1 text-muted-foreground">
              Criado em {{ item.createdAt | date: 'dd/MM/yyyy' }} · Pago em {{ item.paidAt ? (item.paidAt | date: 'dd/MM/yyyy') : '—' }}
            </p>
          </li>
        }
      </ul>

      <nav class="flex items-center justify-center gap-4" aria-label="Paginação">
        <button hlmBtn variant="outline" size="sm" type="button" data-teste="anterior" [disabled]="!pagina.hasPreviousPage" (click)="irPara(pagina.pageNumber - 1)">Anterior</button>
        <span class="text-sm text-muted-foreground">Página {{ pagina.pageNumber }} de {{ pagina.totalPages }}</span>
        <button hlmBtn variant="outline" size="sm" type="button" data-teste="proxima" [disabled]="!pagina.hasNextPage" (click)="irPara(pagina.pageNumber + 1)">Próxima</button>
      </nav>
    }
  }
</div>
```

Como a tabela (desktop) e a lista (mobile) ficam no DOM ao mesmo tempo, os textos aparecem duas vezes — as asserções do spec usam `toContain`/`querySelector`, que continuam válidas.

`aluno.routes.ts` — acrescente o filho (import no topo):

```ts
      { path: 'pagamentos', component: MeusPagamentosComponent },
```

`shell.ts` — dentro do `if (role === 'Student')`, troque por:

```ts
    if (role === 'Student') {
      base.push(
        { rota: '/aluno/matriculas', rotulo: 'Meus cursos' },
        { rota: '/aluno/pagamentos', rotulo: 'Pagamentos' },
      );
    }
```

- [ ] **Step 4: Rodar e ver passar**

Run: o mesmo do Step 2. Expected: PASS.

- [ ] **Step 5: Verificar e commit**

```bash
npm run format && npm run lint && npm test -- --watch=false && npx ng build
git add src/app/features/aluno src/app/core/layout/shell
git commit -m "feat: meus pagamentos com curso, status e paginacao"
```

---

### Task 8: Perfil do aluno

**Files:**
- Create: `src/app/features/aluno/perfil/perfil.ts`, `.html`, `.spec.ts`
- Modify: `src/app/features/aluno/aluno.routes.ts`, `src/app/core/layout/shell/shell.ts`, `shell.spec.ts`

**Interfaces:**
- Consumes: `PerfilAlunoService.perfil`, `.recarregarPerfil` (Task 3); `AlunoApiService.atualizarNome` (Task 2); `NotificacaoService.sucesso`; `extrairErroApi` (Task 3).
- Produces: rota `perfil` → `PerfilComponent`; link do shell `{ rota: '/aluno/perfil', rotulo: 'Perfil' }`.

- [ ] **Step 1: Teste que falha**

`perfil.spec.ts`:

```ts
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';
import { AlunoApiService } from '../../../core/api/aluno-api.service';
import { PerfilAluno } from '../../../core/api/modelos/aluno';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { PerfilComponent } from './perfil';

registerLocaleData(localePt, 'pt-BR');

describe('PerfilComponent', () => {
  const perfil = signal<PerfilAluno | null>({ id: 6, nome: 'Aluno Seis', email: 'seis@t.dev', dataCadastro: '2026-05-04T12:00:00Z' });
  const perfilAluno = { perfil, recarregarPerfil: vi.fn() };
  const alunoApi = { atualizarNome: vi.fn<(id: number, nome: string) => Promise<void>>() };
  const notificacao = { sucesso: vi.fn(), erro: vi.fn(), info: vi.fn() };
  let fixture: ComponentFixture<PerfilComponent>;
  const el = () => fixture.nativeElement as HTMLElement;
  const campo = () => el().querySelector<HTMLInputElement>('input[formControlName="nome"]')!;
  const salvar = () => el().querySelector<HTMLButtonElement>('button[type="submit"]')!;

  async function digitar(valor: string): Promise<void> {
    campo().value = valor;
    campo().dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    perfilAluno.recarregarPerfil.mockReset();
    alunoApi.atualizarNome.mockReset();
    notificacao.sucesso.mockReset();
    await TestBed.configureTestingModule({
      imports: [PerfilComponent],
      providers: [
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: PerfilAlunoService, useValue: perfilAluno },
        { provide: AlunoApiService, useValue: alunoApi },
        { provide: NotificacaoService, useValue: notificacao },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PerfilComponent);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('mostra os dados e o nome atual no campo', () => {
    expect(el().textContent).toContain('seis@t.dev');
    expect(el().textContent).toContain('04/05/2026');
    expect(campo().value).toBe('Aluno Seis');
  });

  it('Salvar fica desabilitado sem alteração', () => {
    expect(salvar().disabled).toBe(true);
  });

  it('salva o nome novo, avisa e recarrega o perfil', async () => {
    alunoApi.atualizarNome.mockResolvedValue();
    await digitar('Nome Novo');
    expect(salvar().disabled).toBe(false);
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(alunoApi.atualizarNome).toHaveBeenCalledWith(6, 'Nome Novo');
    expect(notificacao.sucesso).toHaveBeenCalledWith('Perfil atualizado');
    expect(perfilAluno.recarregarPerfil).toHaveBeenCalled();
  });

  it('nome vazio é inválido e não chama a API', async () => {
    await digitar('   ');
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(alunoApi.atualizarNome).not.toHaveBeenCalled();
    expect(el().textContent).toContain('Informe o nome.');
  });

  it('422 mostra a mensagem da API no campo', async () => {
    alunoApi.atualizarNome.mockRejectedValue({
      status: 422,
      titulo: 'Erro de validação',
      detalhe: 'x',
      erros: { Nome: ['O nome deve ter no máximo 100 caracteres.'] },
    });
    await digitar('Outro Nome');
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el().textContent).toContain('O nome deve ter no máximo 100 caracteres.');
  });
});
```

Em `shell.spec.ts`, no teste do aluno, acrescente a asserção de `a[href="/aluno/perfil"]`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --watch=false --include "**/aluno/perfil/perfil.spec.ts" --include "**/shell.spec.ts"`. Expected: FAIL.

- [ ] **Step 3: Implementar**

`perfil.ts`:

```ts
import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';
import { AlunoApiService } from '../../../core/api/aluno-api.service';
import { extrairErroApi } from '../../../core/http/erro-api';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';

@Component({
  selector: 'app-perfil',
  imports: [DatePipe, ReactiveFormsModule, HlmButtonImports, HlmCardImports, HlmInputImports, HlmLabelImports],
  templateUrl: './perfil.html',
})
export class PerfilComponent {
  private readonly perfilAluno = inject(PerfilAlunoService);
  private readonly alunoApi = inject(AlunoApiService);
  private readonly notificacao = inject(NotificacaoService);

  protected readonly perfil = this.perfilAluno.perfil;
  protected readonly formulario = new FormGroup({
    nome: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
  });
  private readonly nome = this.formulario.controls.nome;
  protected readonly enviando = signal(false);
  protected readonly erroDaApi = signal<string | null>(null);

  constructor() {
    effect(() => {
      const perfil = this.perfil();
      if (perfil && !this.nome.dirty) this.nome.setValue(perfil.nome);
    });
  }

  protected podeSalvar(): boolean {
    const perfil = this.perfil();
    const valor = this.nome.value.trim();
    return !!perfil && !this.enviando() && valor.length > 0 && valor.length <= 100 && valor !== perfil.nome;
  }

  protected mensagemDoCampo(): string | null {
    if (this.erroDaApi()) return this.erroDaApi();
    if (!this.nome.touched) return null;
    if (this.nome.value.trim().length === 0) return 'Informe o nome.';
    if (this.nome.hasError('maxlength')) return 'Use no máximo 100 caracteres.';
    return null;
  }

  protected async salvar(): Promise<void> {
    this.nome.markAsTouched();
    const perfil = this.perfil();
    if (!perfil || !this.podeSalvar()) return;
    this.enviando.set(true);
    this.erroDaApi.set(null);
    try {
      await this.alunoApi.atualizarNome(perfil.id, this.nome.value.trim());
      this.notificacao.sucesso('Perfil atualizado');
      this.nome.markAsPristine();
      this.perfilAluno.recarregarPerfil();
    } catch (e) {
      const erro = extrairErroApi(e);
      if (erro?.status === 422) {
        this.erroDaApi.set((erro.erros?.['Nome'] ?? erro.erros?.['nome'] ?? [erro.detalhe]).join(' '));
      }
    } finally {
      this.enviando.set(false);
    }
  }
}
```

`perfil.html`:

```html
<section hlmCard class="max-w-lg">
  <div hlmCardHeader>
    <h1 hlmCardTitle class="text-2xl">Meu perfil</h1>
  </div>
  @if (perfil(); as dados) {
    <div hlmCardContent class="flex flex-col gap-4">
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt class="text-muted-foreground">E-mail</dt>
        <dd>{{ dados.email }}</dd>
        <dt class="text-muted-foreground">Aluno desde</dt>
        <dd>{{ dados.dataCadastro | date: 'dd/MM/yyyy' }}</dd>
      </dl>

      <form class="flex flex-col gap-2" [formGroup]="formulario" (ngSubmit)="salvar()" novalidate>
        <label hlmLabel for="nome">Nome</label>
        <input hlmInput id="nome" type="text" formControlName="nome" maxlength="100" />
        @if (mensagemDoCampo(); as mensagem) {
          <p class="text-sm text-destructive" role="alert">{{ mensagem }}</p>
        }
        <button hlmBtn type="submit" class="self-start" [disabled]="!podeSalvar()">
          {{ enviando() ? 'Salvando...' : 'Salvar' }}
        </button>
      </form>
    </div>
  }
</section>
```

`aluno.routes.ts`: acrescente `{ path: 'perfil', component: PerfilComponent }`.
`shell.ts`: acrescente `{ rota: '/aluno/perfil', rotulo: 'Perfil' }` ao `push` do aluno.

- [ ] **Step 4: Rodar e ver passar**

Run: o mesmo do Step 2. Expected: PASS.

- [ ] **Step 5: Verificar e commit**

```bash
npm run format && npm run lint && npm test -- --watch=false && npx ng build
git add src/app/features/aluno src/app/core/layout/shell
git commit -m "feat: perfil do aluno com edicao do nome"
```

---

### Task 9: E2E do portal e documentação

**Files:**
- Create: `e2e/apoio/api.ts`, `e2e/portal-do-aluno.spec.ts`
- Modify: `e2e/entrar.spec.ts`, `e2e/rota-protegida.spec.ts`, `CLAUDE.md`, `README.md`

**Interfaces:**
- Consumes: rotas e textos das Tasks 4–8 ("Matricular-me", "Matrícula realizada", "Meus cursos", "Nome", "Salvar", "Perfil atualizado", "Nenhum pagamento registrado."); Admin semeado da API.

- [ ] **Step 1: Helper**

`e2e/apoio/api.ts`:

```ts
import { APIRequestContext, expect } from '@playwright/test';

export const API_URL = process.env['API_URL'] ?? 'http://localhost:5130';
export const ADMIN_EMAIL = process.env['E2E_ADMIN_EMAIL'];
export const ADMIN_SENHA = process.env['E2E_ADMIN_SENHA'];

export async function apiDisponivel(request: APIRequestContext): Promise<boolean> {
  const saude = await request.get(`${API_URL}/health/ready`).catch(() => null);
  return !!saude?.ok();
}

export async function entrarComoAdmin(request: APIRequestContext): Promise<string> {
  const resposta = await request.post(`${API_URL}/tech-curse/Auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_SENHA },
  });
  expect(resposta.status(), 'login do Admin semeado (confira E2E_ADMIN_EMAIL/E2E_ADMIN_SENHA)').toBe(200);
  return (await resposta.json()).accessToken as string;
}

export async function criarCurso(
  request: APIRequestContext,
  token: string,
): Promise<{ id: number; titulo: string }> {
  const titulo = `Curso E2E ${Date.now()}`;
  const resposta = await request.post(`${API_URL}/tech-curse/Course`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { titulo, descricao: 'Curso criado pelo teste E2E.', categoria: 'E2E', cargaHoraria: 8 },
  });
  expect(resposta.status()).toBe(201);
  const curso = await resposta.json();
  return { id: curso.id as number, titulo };
}
```

- [ ] **Step 2: Fluxo completo**

`e2e/portal-do-aluno.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_SENHA, API_URL, apiDisponivel, criarCurso, entrarComoAdmin } from './apoio/api';

test.beforeAll(async ({ request }) => {
  test.skip(!(await apiDisponivel(request)), `API indisponível em ${API_URL}; suba a API do repo tech-curse.`);
  test.skip(
    !ADMIN_EMAIL || !ADMIN_SENHA,
    'Defina E2E_ADMIN_EMAIL e E2E_ADMIN_SENHA com as credenciais do Admin semeado (Seed:Admin:*) da API.',
  );
});

test('aluno se registra, se matricula, vê seus cursos, edita o perfil e vê pagamentos', async ({ page, request }) => {
  const curso = await criarCurso(request, await entrarComoAdmin(request));
  const sufixo = Date.now();
  const email = `aluno.portal+${sufixo}@teste.dev`;
  const senha = 'Senha@123';

  await page.goto('/registrar');
  await page.getByLabel('Nome de usuário').fill(`alunoportal${sufixo}`);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByLabel('Confirmar senha').fill(senha);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/entrar$/, { timeout: 15_000 });

  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/cursos$/);

  await page.goto(`/cursos/${curso.id}`);
  await expect(page.getByRole('heading', { name: curso.titulo })).toBeVisible();
  await page.getByRole('button', { name: 'Matricular-me' }).click();
  await expect(page.getByText('Matrícula realizada')).toBeVisible();
  await expect(page.getByText('Você está matriculado')).toBeVisible();

  await page.getByRole('link', { name: 'Meus cursos' }).first().click();
  await expect(page).toHaveURL(/\/aluno\/matriculas$/);
  await expect(page.getByRole('link', { name: curso.titulo })).toBeVisible();

  await page.goto('/aluno/perfil');
  await page.getByLabel('Nome').fill(`Aluno Portal ${sufixo}`);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Perfil atualizado')).toBeVisible();

  await page.goto('/aluno/pagamentos');
  await expect(page.getByText('Nenhum pagamento registrado.')).toBeVisible();
});
```

- [ ] **Step 3: Folga no primeiro carregamento dos fluxos existentes**

Em `e2e/entrar.spec.ts`, troque `await expect(page).toHaveURL(/\/entrar$/);` por `await expect(page).toHaveURL(/\/entrar$/, { timeout: 15_000 });`.
Em `e2e/rota-protegida.spec.ts`, na primeira asserção de URL depois de `page.goto('/cursos')`, acrescente `{ timeout: 15_000 }`.

- [ ] **Step 4: Rodar**

Pré-condições (o controlador prepara, não o subagente): Docker com `db`, `redis`, `seq`; API do `tech-curse` no host com `Seed:Admin:Email`/`Seed:Admin:Password` configurados; `E2E_ADMIN_EMAIL`/`E2E_ADMIN_SENHA` exportados.

Run: `npm run e2e`
Expected: 3 passed. Sem as variáveis do Admin, o fluxo novo aparece como **skipped** com a mensagem acima e os outros dois passam. Sem a API, os três são pulados.

- [ ] **Step 5: Documentação**

`CLAUDE.md`:
- Em "Arquitetura", acrescente: `core/aluno/` — `PerfilAlunoService` (perfil do `/Student/me` e matrículas em signals; estado `inativo | carregando | pendente | ativo | erro`), lido pelo catálogo, pelo detalhe e pela área `/aluno`.
- Em "Decisões registradas", acrescente:
  - `SILENCIAR_ERRO` (`HttpContextToken` do `erroInterceptor`): a requisição converte o erro para `ErroApi` mas não mostra toast. Usado pelo `/Student/me`, cujo 404 é o estado "perfil pendente".
  - Erros de `httpResource` podem chegar embrulhados (`cause`); leia com `extrairErroApi`.
  - Estado de listas (página, ordem, categoria) fica na query string e chega aos componentes como inputs (`withComponentInputBinding`).
  - Locale `pt-BR` e moeda `BRL` registrados no `app.config.ts`.
- Em "Comandos", na linha do `npm run e2e`, acrescente: o fluxo do portal exige `E2E_ADMIN_EMAIL`/`E2E_ADMIN_SENHA` iguais ao `Seed:Admin:*` da API (sem eles, é pulado).
- Em "Fases", marque a Fase 2 com o spec `docs/superpowers/specs/2026-09-23-portal-do-aluno-design.md`.

`README.md`, seção de testes: acrescente como rodar o E2E do portal:

````markdown
O fluxo do portal do aluno precisa do Admin semeado da API (em `../tech-curse`, `dotnet user-secrets set "Seed:Admin:Email" ...` e `"Seed:Admin:Password" ...`) e das mesmas credenciais aqui:

```bash
E2E_ADMIN_EMAIL=admin@techcurse.dev E2E_ADMIN_SENHA='<senha>' npm run e2e
```
````

- [ ] **Step 6: Verificar e commit**

```bash
npm run format && npm run lint && npm test -- --watch=false && npx ng build
git add e2e CLAUDE.md README.md
git commit -m "test: fluxo e2e do portal do aluno e documentacao da fase 2"
```

---

## Verificação final da fase

- [ ] `npm run lint`, `npm run format:check`, `npm test -- --watch=false`, `npx ng build` limpos.
- [ ] `npm run e2e` com API e Admin semeado: 3 passed.
- [ ] Manual: catálogo ordena e filtra pela categoria e o voltar do navegador restaura; detalhe matricula e mostra o selo; "Meus cursos", "Pagamentos" e "Perfil" no shell (desktop e mobile); moeda e datas em pt-BR; modo escuro legível nos selos.
