# Tech Curse Web — Fase 2: Portal do Aluno

**Data:** 2026-09-23
**Status:** aprovado em brainstorming, aguardando plano de implementação
**Depende de:** Fase 1 (`docs/superpowers/specs/2026-09-18-fundacao-angular-design.md`), já integrada na `main`.

## Objetivo

Dar ao aluno (role `Student`) um portal completo sobre a base da Fase 1: catálogo com ordenação, filtro e detalhe do curso; matrícula; lista dos próprios cursos; lista dos próprios pagamentos; e visualização e edição do próprio perfil.

## Restrições vindas do backend

Levantadas lendo o `tech-curse` em 2026-09-23. **Nenhuma mudança no backend faz parte desta fase.**

1. **Cadastro não cria perfil de estudante.** `POST /Auth/register` cria só o usuário do Identity. A entidade `Student` (usada por `/Student/me`, matrícula e pagamentos) só é criada por `POST /Student`, que exige role `Admin`. Um aluno recém-cadastrado recebe `404` em `/Student/me`. **Decisão:** o front trata esse caso como "perfil pendente": mostra um aviso e bloqueia matrícula, cursos, pagamentos e perfil até um Admin criar o perfil (pelo Swagger agora, ou pelo painel da Fase 3).
2. **Pagamento não se liga a curso no front.** `PaymentOutputDto` traz `enrollmentId`, mas não `courseId`; `CourseStudentOutputDto` (matrículas do aluno) traz `courseId`, mas não `enrollmentId`. **Decisão:** a lista de pagamentos mostra "Matrícula nº X" em vez do nome do curso.
3. **Não existe rota para cancelar matrícula.** A matrícula só pode ser criada.
4. **Não existe rota que liste as categorias** nem busca por texto em `/Course`. O filtro por categoria usa valor exato.
5. **Pagamento é só leitura para o aluno.** Criar, processar e estornar exigem `Admin`.
6. **Achado de segurança (fora do escopo):** `POST /Auth/register` é público e aceita `role` no corpo; qualquer pessoa consegue se cadastrar como `Admin` chamando a API diretamente. Deve ser corrigido no `tech-curse` antes de produção. Os E2E desta fase usam esse comportamento para montar dados de teste (ver "Testes").

## Contrato da API usado nesta fase

Base: `{apiUrl}` = `http://localhost:5130/tech-curse` em desenvolvimento. Enums vêm como string (`JsonStringEnumConverter`).

| Método | Rota | Acesso | Corpo / Resposta |
|---|---|---|---|
| GET | `/Student/me` | Student | 200 `{ id, nome, email, dataCadastro }`; 404 se não há perfil |
| PUT | `/Student/{id}` | dono ou Admin | `{ nome }` (obrigatório, até 100 caracteres) → 204; 422 com `errors.Nome` |
| GET | `/Student/{id}/enrollments` | dono ou Admin | 200 `[{ courseId, titulo, descricao, categoria, matriculaAtiva }]` |
| GET | `/Course` | autenticado | query `PageNumber`, `PageSize` (máx. 50), `SortBy` (`titulo` \| `categoria` \| `datacriacao` \| outro = id), `SortDirection` (`asc` \| `desc`), `Categoria` (exata) → `ResultadoPaginado<Curso>` |
| GET | `/Course/{id}` | autenticado | 200 `Curso`; 404 |
| POST | `/Enrollment` | Student ou Admin | `{ courseId, studentId }` → 202 `{ mensagem }`; 404 aluno/curso; 409 já matriculado. Para Student, o backend identifica o aluno pelo e-mail do token e ignora `studentId` |
| GET | `/Payment/student/{studentId}` | dono ou Admin | query `PageNumber`, `PageSize` → `ResultadoPaginado<Pagamento>` |

Formas usadas no front:

```ts
interface PerfilAluno { id: number; nome: string; email: string; dataCadastro: string }
interface MatriculaAluno { courseId: number; titulo: string; descricao: string; categoria: string; matriculaAtiva: boolean }
type StatusPagamento = 'Pending' | 'Paid' | 'Failed' | 'Refunded'
interface Pagamento {
  paymentId: number; enrollmentId: number; studentId: number; amount: number;
  status: StatusPagamento; isActive: boolean; createdAt: string; paidAt: string | null;
  externalTransactionId: string | null;
}
```

## Decisões

| Tema | Decisão | Motivo |
|---|---|---|
| Carregamento do perfil | `PerfilAlunoService` compartilhado (`providedIn: 'root'`) com `httpResource` e signals | uma requisição por sessão; catálogo e área do aluno leem o mesmo estado; mesmo padrão da Fase 1 |
| Perfil pendente | 404 do `/me` vira estado `pendente`; `AlunoLayout` mostra aviso no lugar do conteúdo | escolha do usuário; sem mudança no backend |
| Toast do 404 esperado | `HttpContextToken` `SILENCIAR_ERRO` no `erroInterceptor`, usado pelo `/me` | o 404 do perfil pendente não é erro para o usuário; o recurso é genérico |
| Estado do catálogo | página, ordenação e categoria na query string | voltar e links compartilhados funcionam; `withComponentInputBinding` já está ligado |
| Filtro de categoria | clicar na categoria de um curso filtra; chip "× Limpar" remove | a API não lista categorias; evita digitar valor exato |
| Pagamentos | tabela paginada sem nome do curso | restrição 2 |
| Formatação | locale `pt-BR` registrado na aplicação (`LOCALE_ID` + `registerLocaleData`) | moeda em R$ e datas em dd/MM/yyyy |

## Rotas

```
''  → ShellComponent (autenticadoGuard)
  'cursos'           → lazy CATALOGO_ROUTES
     ''              → ListaCursosComponent   (query: pagina, ordem, categoria)
     ':id'           → DetalheCursoComponent
  'aluno'            → lazy ALUNO_ROUTES      (canMatch: roleGuard(['Student']))
     ''              → AlunoLayoutComponent
        ''           → redirect 'matriculas'
        'matriculas' → MeusCursosComponent
        'pagamentos' → MeusPagamentosComponent  (query: pagina)
        'perfil'     → PerfilComponent
```

A ordem das rotas `''` do `app.routes.ts` (shell antes do layout público) não muda.

**Navegação do shell:** aluno vê `Cursos`, `Meus cursos` (`/aluno/matriculas`), `Pagamentos` (`/aluno/pagamentos`) e `Perfil` (`/aluno/perfil`); Admin e Instructor continuam vendo `Cursos` e `Admin`. Mesma regra no menu mobile.

## `PerfilAlunoService` (`src/app/core/aluno/perfil-aluno.service.ts`)

- `perfilRecurso`: `httpResource<PerfilAluno>` de `{apiUrl}/Student/me` com `context` `SILENCIAR_ERRO`. O request só existe quando `auth.role() === 'Student'`; fora disso é `undefined`, e o recurso fica em repouso. Assim, no logout ou na troca de usuário, o estado volta sozinho, sem limpeza manual.
- `estado: Signal<'inativo' | 'carregando' | 'pendente' | 'ativo' | 'erro'>`:
  - `inativo` quando a role não é `Student`;
  - `carregando` enquanto o `/me` está em andamento;
  - `pendente` quando o erro é `ErroApi` com `status === 404`;
  - `erro` para qualquer outro erro;
  - `ativo` quando há valor.
- `perfil: Signal<PerfilAluno | null>`.
- `matriculasRecurso`: `httpResource<MatriculaAluno[]>` de `{apiUrl}/Student/{id}/enrollments`, com request só quando `perfil()` existe.
- `matriculas: Signal<MatriculaAluno[]>` (vazio enquanto não carregou).
- `cursosMatriculados: Signal<ReadonlySet<number>>` (conjunto de `courseId`).
- `recarregarPerfil()`, `recarregarMatriculas()`.

## Services de API

- `CursoService` (Fase 1) ganha:
  - `listar(parametros)` passa a aceitar `ordem?: OrdemCursos` e `categoria?: string | null`, traduzidos para `SortBy`/`SortDirection`/`Categoria`;
  - `obter(id: Signal<number>)`: `httpResource<Curso>` de `/Course/{id}`.
  - `OrdemCursos = 'recentes' | 'titulo-asc' | 'titulo-desc' | 'categoria'` → (`datacriacao`,`desc`), (`titulo`,`asc`), (`titulo`,`desc`), (`categoria`,`asc`). Padrão: `recentes`.
- `MatriculaService` (`core/api/matricula.service.ts`): `matricular(courseId: number, studentId: number): Promise<void>` (`POST /Enrollment`).
- `AlunoApiService` (`core/api/aluno-api.service.ts`): `atualizarNome(id: number, nome: string): Promise<void>` (`PUT /Student/{id}`).
- `PagamentoService` (`core/api/pagamento.service.ts`): `listarDoAluno(studentId: Signal<number | null>, parametros: Signal<ParametrosPaginacao>)`: `httpResource` de `/Payment/student/{id}`, com request só quando o id existe.

## Telas

### Catálogo (`/cursos`, alterada)

- Controles: select de ordenação ("Mais recentes", "Título A–Z", "Título Z–A", "Categoria"); chip "Categoria: X ×" quando há filtro.
- Card: título como link para `/cursos/:id`; categoria como botão que aplica o filtro (vai para a página 1); carga horária; descrição.
- Aluno com perfil `ativo`: selo "Matriculado" nos cursos presentes em `cursosMatriculados`.
- Query string: `pagina` (padrão 1), `ordem` (padrão `recentes`), `categoria` (opcional). Mudar ordenação ou categoria volta para a página 1. Valores inválidos na URL caem nos padrões.
- Estados de carregando, vazio e erro continuam os da Fase 1. Com filtro ativo, o vazio diz "Nenhum curso na categoria X".

### Detalhe do curso (`/cursos/:id`, nova)

- Mostra título, categoria (que leva ao catálogo filtrado), carga horária, data de criação e descrição completa.
- Área de ação, só para `Student`:
  - `ativo` e não matriculado: botão "Matricular-me" (desabilitado enquanto envia). Sucesso: toast "Matrícula realizada" e `recarregarMatriculas()`. Erro: o toast padrão do `erroInterceptor` (inclui 409 "já matriculado" e 404).
  - `ativo` e matriculado: selo "Você está matriculado" e link para "Meus cursos".
  - `pendente`: botão desabilitado e texto "Seu cadastro está aguardando liberação por um administrador."
  - `carregando`: botão desabilitado.
- Admin/Instructor: sem área de ação.
- `id` inválido ou 404: estado "Curso não encontrado" com link para o catálogo. Link "← Voltar ao catálogo" no topo.

### `AlunoLayoutComponent` (nova)

- `carregando`: esqueleto.
- `pendente`: card com "Seu cadastro está aguardando liberação por um administrador. Enquanto isso, você pode navegar pelo catálogo." e link para `/cursos`.
- `erro`: "Não foi possível carregar seu perfil." e botão "Tentar novamente" (`recarregarPerfil()`).
- `ativo`: `<router-outlet />`.

### Meus cursos (`/aluno/matriculas`, nova)

- Cards com título (link para `/cursos/:courseId`), categoria, descrição e selo "Ativa" ou "Inativa" (`matriculaAtiva`).
- Vazio: "Você ainda não está matriculado em nenhum curso." com link "Ver catálogo".
- Estados de carregando e erro (com "Tentar novamente") vindos de `matriculasRecurso`.

### Meus pagamentos (`/aluno/pagamentos`, nova)

- Tabela: Matrícula (`nº {enrollmentId}`), Valor (`amount | currency:'BRL'`), Status (selo), Criado em, Pago em (`—` quando nulo).
- Selos: `Pending` → "Pendente", `Paid` → "Pago", `Failed` → "Falhou", `Refunded` → "Estornado", cada um com cor própria do tema.
- Paginação Anterior/Próxima com `pagina` na query string; tamanho de página 10.
- Vazio: "Nenhum pagamento registrado." Carregando e erro como nas outras listas.
- Em telas estreitas, a tabela vira lista de cards (sem rolagem horizontal da página).

### Perfil (`/aluno/perfil`, nova)

- Mostra nome, e-mail e "Aluno desde" (`dataCadastro`).
- Formulário com o campo nome (Reactive Forms: obrigatório, até 100 caracteres), iniciado com o nome atual, e botão "Salvar" (desabilitado sem alteração ou enquanto envia).
- Sucesso: toast "Perfil atualizado" e `recarregarPerfil()`.
- 422: mensagem de `errors.Nome` (ou `errors.nome`) abaixo do campo. Outros erros: toast padrão.

## Mudança no `erroInterceptor`

- Novo `export const SILENCIAR_ERRO = new HttpContextToken<boolean>(() => false)` em `core/http/erro.interceptor.ts`.
- Quando `req.context.get(SILENCIAR_ERRO)` é `true`, o interceptor ainda converte para `ErroApi` e propaga, mas não mostra toast.
- Documentar em `CLAUDE.md` → "Decisões registradas".

## Formatação pt-BR

`app.config.ts` registra `localePt` (`@angular/common/locales/pt`) com `registerLocaleData` e fornece `{ provide: LOCALE_ID, useValue: 'pt-BR' }` e `{ provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' }`. Datas usam `date:'dd/MM/yyyy'`.

## Testes

### Unitários (Vitest)

- `erroInterceptor`: com `SILENCIAR_ERRO`, 404 e 500 não geram toast, mas o erro continua sendo `ErroApi`.
- `PerfilAlunoService`: `inativo` para Admin e para anônimo (nenhuma requisição ao `/me`); `carregando` → `ativo`; 404 → `pendente` sem toast; 500 → `erro`; matrículas só depois do perfil; `cursosMatriculados`; volta para `inativo` quando a role deixa de ser `Student`.
- `CursoService`: tradução de `ordem`/`categoria` para os query params; `obter(id)`.
- `MatriculaService`, `AlunoApiService`: método, URL e corpo.
- `PagamentoService`: não faz requisição sem `studentId`; params de paginação.
- `ListaCursosComponent`: leitura e escrita da query string; filtro por categoria e chip de limpar; selo "Matriculado" só para aluno ativo.
- `DetalheCursoComponent`: cada estado da área de ação; matrícula com sucesso (toast e recarga); 404 do curso.
- `AlunoLayoutComponent`: os quatro estados.
- `MeusCursosComponent`, `MeusPagamentosComponent`: carregando, vazio, erro e lista; rótulos de status; moeda e data em pt-BR; paginação.
- `PerfilComponent`: botão desabilitado sem alteração; sucesso; 422 no campo.
- `ShellComponent`: links do aluno.
- `app.routes.spec.ts`: `/aluno` → `/aluno/matriculas`; `/cursos/1` renderiza o detalhe; aluno pendente em `/aluno/matriculas` vê o aviso.

### E2E (Playwright, contra a API real)

Mesma pré-condição da Fase 1 (API em `API_URL`, padrão `http://localhost:5130`; testes são pulados se `/health/ready` falhar). Um helper `e2e/apoio/api.ts` monta os dados pela API:

- `criarAdminDescartavel(request)`: registra `admin<timestamp>` com `role: 'Admin'` (restrição 6) e faz login, devolvendo o token.
- `criarCurso(request, tokenAdmin)`: `POST /Course` com `{ titulo: "Curso E2E <timestamp>", descricao, categoria: "E2E", cargaHoraria: 8 }`.
- `registrarAluno(request)` e `criarPerfilAluno(request, tokenAdmin, nome, email)` (`POST /Student`).

Fluxos:

1. **Perfil pendente:** aluno recém-registrado entra, vai a `/aluno` e vê o aviso de cadastro aguardando liberação.
2. **Fluxo completo:** Admin descartável cria um curso e o perfil do aluno; aluno entra, abre o detalhe do curso, clica em "Matricular-me", vê o toast, confere o curso em "Meus cursos", edita o nome no perfil e vê "Nenhum pagamento registrado." em pagamentos.

Os usuários e cursos criados pelos E2E ficam no banco local de desenvolvimento (a API não permite apagar usuários). Nomes com timestamp evitam colisão entre execuções.

## Fora de escopo

- Qualquer mudança no backend (criação automática de perfil, `courseId` no pagamento, cancelamento de matrícula, listagem de categorias, correção da role no registro).
- Pagar ou estornar pelo portal do aluno.
- Painel administrativo (Fase 3).
- Busca por texto no catálogo.

## Riscos

- `httpResource` com `context` e request condicional: confirmar na implementação que request `undefined` deixa o recurso em repouso e que trocar a role reinicia o estado.
- `PageSize` máximo do backend é 50; o front usa 12 no catálogo e 10 em pagamentos.
- A chave do erro 422 no `PUT /Student` vem do FluentValidation (`Nome`); tratar também `nome` por segurança.
