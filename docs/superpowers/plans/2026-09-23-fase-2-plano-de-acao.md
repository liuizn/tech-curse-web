# Fase 2 — Plano de ação para a próxima sessão

**Data:** 2026-09-23
**Para quem:** a sessão que vai assumir a implementação da Fase 2 (portal do aluno) do `tech-curse-web`.
**Leia antes de tudo:** este arquivo, depois o spec e o plano abaixo. Não é preciso nenhum contexto de conversa anterior.

| Documento | Caminho (neste repositório) | Papel |
|---|---|---|
| Spec (autoridade) | `docs/superpowers/specs/2026-09-23-portal-do-aluno-design.md` | o que construir e por quê |
| Plano de implementação | `docs/superpowers/plans/2026-09-23-portal-do-aluno.md` | 9 tasks com código, testes e commits |
| Este plano de ação | `docs/superpowers/plans/2026-09-23-fase-2-plano-de-acao.md` | estado, pré-requisitos, ordem e armadilhas |
| Regras do projeto | `CLAUDE.md` | convenções, comandos e decisões já tomadas |

---

## 1. Estado em 2026-09-23

### Front (`tech-curse-web`, `C:\Users\luizg\source\repos\Liuizn\tech-curse-web`)

- `main` tem a Fase 1 inteira (PR [liuizn/tech-curse-web#1](https://github.com/liuizn/tech-curse-web/pull/1)).
- Branch **`feat/portal-do-aluno`**, já publicado localmente, **sem código da Fase 2**. Contém só:
  - `7751cce` spec da Fase 2;
  - `ead46f6` `angular.json` com `"analytics": false` (evita o prompt de telemetria travar execuções automáticas);
  - `383b441` spec revisado depois dos PRs #39/#40 do backend;
  - `5d274bd` plano de implementação;
  - o commit deste plano de ação.
- Árvore limpa. Suíte da Fase 1: 69 unitários + 2 E2E passando.

### Backend (`tech-curse`, `C:\Users\luizg\source\repos\Liuizn\tech-curse`)

- `main` tem os PRs [#39](https://github.com/liuizn/tech-curse/pull/39) (registro só cria aluno; `POST /Auth/users` só Admin; Admin semeado em `Development`) e [#40](https://github.com/liuizn/tech-curse/pull/40) (cadastro cria o perfil `Student`; pagamento com `courseId`/`courseTitulo`; matrícula com `enrollmentId`). Esses são os contratos que a Fase 2 consome.
- **Pendente — CI da `main` vermelho** no job "Docker Build, Smoke Test and Push" desde o merge do #40 (`NETSDK1064`). Causa: o `Dockerfile` faz `dotnet publish --no-restore`; quando o cache de camadas do CI traz o passo de restore pronto num runner novo, o cache mount de pacotes vem vazio. Correção pronta no branch remoto **`fix/dockerfile-publish-sem-no-restore`** (commits `20bc5f0` e `9095835`), reproduzida e validada localmente. **Não há PR aberto** — o usuário interrompeu antes. O checkout local do `tech-curse` está nesse branch.
- **Defeito conhecido, sem correção:** `POST /tech-curse/Payment` responde 409 "matrícula inativa" para qualquer matrícula recém-criada, porque `EnrollmentRepository.EnrollmentIsActiveAsync` considera ativa a matrícula com `Status == false` e toda matrícula nasce com `Status = true`. Consequência para o front: um aluno novo não terá pagamentos; a tela "Meus pagamentos" só mostra a lista vazia na prática. Está registrado no spec (restrição 7).

### Ambiente local

- Docker Desktop foi iniciado nesta sessão; containers `tech-curse-db-1` (Postgres, porta 5433), `tech-curse-redis-1` (6380), `tech-curse-seq-1` (9000). Há também um `tech-curse-api-1` (imagem antiga, porta 8080) que sobe sozinho por `restart: unless-stopped`; ele não interfere na porta 5130.
- A API usada pelo front roda **no host**: `dotnet run --project src/Api` no `tech-curse`, porta **5130**. Com o `.env` e o `appsettings.Development.json` já alinhados, não precisa de variável de ambiente para conectar.
- O banco local foi recriado em algum momento (ids voltaram a 1): não conte com dados antigos.
- **Não há Admin semeado configurado** (`Seed:Admin:*` não está em user-secrets). Os E2E da Fase 2 precisam dele (seção 3).

---

## 2. Decisões que o usuário precisa tomar (pergunte no início)

1. **PR do `Dockerfile` no backend:** abrir e fazer merge do branch `fix/dockerfile-publish-sem-no-restore`, ou o usuário revisa antes? (Ele interrompeu exatamente nesse ponto; não assuma.) O texto sugerido do PR está na seção 6.
2. **Defeito do `POST /Payment`:** corrigir agora num PR próprio do backend (ver seção 6) ou deixar para depois? Não bloqueia a Fase 2.
3. **Senha do Admin semeado** para desenvolvimento/E2E: gerar uma e gravar em user-secrets (seção 3), ou o usuário prefere definir.
4. **Modo de execução:** nas fases anteriores o usuário escolheu **subagent-driven** (um subagente por task + revisão por task + revisão final). Confirme.

Tudo abaixo assume que a execução segue o plano sem mudanças de escopo.

---

## 3. Pré-requisitos antes da Task 1

```bash
node -v
```
Precisa ser ≥ 24.15 (o Angular CLI 22 recusa versões menores).

```bash
docker ps --format '{{.Names}} {{.Status}}'
```
`tech-curse-db-1` precisa estar `healthy`. Se o daemon não responder, inicie o Docker Desktop e depois `docker-compose up -d db redis seq` em `../tech-curse`.

No `tech-curse`, **antes de rodar a API**, volte para a `main` atualizada (a API que o front consome precisa ter #39 e #40; o branch do `Dockerfile` também tem, mas deixe a `main` como referência):

```bash
git -C ../tech-curse checkout main
```

```bash
git -C ../tech-curse pull
```

Admin semeado (só uma vez; senha forte, nunca em arquivo versionado):

```bash
dotnet user-secrets set "Seed:Admin:Email" "admin@techcurse.dev" --project ../tech-curse/src/Api
```

```bash
dotnet user-secrets set "Seed:Admin:Password" "<senha forte>" --project ../tech-curse/src/Api
```

Subir a API (em outro terminal ou em background):

```bash
dotnet run --project ../tech-curse/src/Api
```

Confirme `http://localhost:5130/health/ready` → 200. Para os E2E, exporte as mesmas credenciais:

```bash
export E2E_ADMIN_EMAIL=admin@techcurse.dev E2E_ADMIN_SENHA='<senha forte>'
```

Na primeira subida depois de configurar o seed, faça login com o Admin (`POST /tech-curse/Auth/login`) para confirmar que ele existe.

---

## 4. Ordem de execução

Siga o plano de implementação task a task, **no branch `feat/portal-do-aluno`**. As dependências:

```
1 SILENCIAR_ERRO + locale ─┐
2 modelos + services ──────┼─→ 3 extrairErroApi + PerfilAlunoService ─→ 4 catálogo ─→ 5 detalhe
                           │                                          └─→ 6 área do aluno + Meus cursos ─→ 7 pagamentos ─→ 8 perfil
                           └──────────────────────────────────────────────────────────────────────────→ 9 E2E + docs
```

| Task | Entrega | Commit |
|---|---|---|
| 1 | `SILENCIAR_ERRO` no `erroInterceptor`; locale `pt-BR` e `BRL` no `app.config.ts` | `feat: silenciar toasts de erros esperados e registrar locale pt-BR` |
| 2 | modelos `aluno.ts`/`pagamento.ts`; `CursoService` com ordem, categoria e `obter`; `MatriculaService`, `AlunoApiService`, `PagamentoService` | `feat: services de matricula, perfil e pagamentos e catalogo com ordem e categoria` |
| 3 | `extrairErroApi`; `PerfilAlunoService` (estados `inativo/carregando/pendente/ativo/erro`) | `feat: servico de perfil do aluno com estado pendente e matriculas` |
| 4 | catálogo: ordenação, filtro por categoria, selo "Matriculado", link para o detalhe, query string | `feat: catalogo com ordenacao, filtro por categoria, selo de matricula e link para o detalhe` |
| 5 | `/cursos/:id` com matrícula | `feat: detalhe do curso com matricula do aluno` |
| 6 | `AlunoLayout` (aviso de pendente), "Meus cursos", link no shell, rotas | `feat: area do aluno com aviso de perfil pendente e meus cursos` |
| 7 | "Meus pagamentos" com curso, status, pt-BR, paginação | `feat: meus pagamentos com curso, status e paginacao` |
| 8 | perfil com edição do nome | `feat: perfil do aluno com edicao do nome` |
| 9 | E2E do portal (Admin semeado), folga de timeout nos E2E da Fase 1, `CLAUDE.md` e `README.md` | `test: fluxo e2e do portal do aluno e documentacao da fase 2` |

Depois das 9: revisão final do branch inteiro (modelo mais capaz), uma onda única de correções, verificação manual (seção 5), PR para `main` e — só com autorização do usuário — merge.

---

## 5. Critérios de pronto

- `npm run lint`, `npm run format:check`, `npm test -- --watch=false` e `npx ng build` limpos.
- `npm run e2e` com API e Admin semeado: **3 passed** (os 2 da Fase 1 + o fluxo do portal).
- Manual no navegador (`npm start`, `http://localhost:4200`):
  - registrar um aluno novo e confirmar que `/aluno` **não** mostra "pendente" (o #40 cria o perfil);
  - catálogo: ordenar, clicar numa categoria, limpar pelo chip, usar o voltar do navegador;
  - detalhe: "Matricular-me" → toast → selo "Você está matriculado"; o curso aparece com selo no catálogo e em "Meus cursos";
  - "Pagamentos" mostra "Nenhum pagamento registrado." (restrição 7);
  - "Perfil": salvar nome novo; salvar desabilitado sem alteração;
  - menu mobile (largura < 768 px) com os quatro links do aluno; modo escuro legível nos selos;
  - moeda e datas em pt-BR.
- PR com descrição em pt-BR **sem** linha "Generated with" nem qualquer atribuição de IA (regra global do usuário).

---

## 6. Pendências do backend (fora da Fase 2, mas decididas com o usuário)

### 6.1 PR do `Dockerfile` (branch pronto)

Descrição sugerida (pt-BR, sem atribuição):

> O job **Docker Build, Smoke Test and Push** falhou na `main` depois do merge do #40 com `NETSDK1064` (`Microsoft.CodeAnalysis.Analyzers 3.11.0 was not found`). O #40 não tocou em `.csproj`, `.props`, `Dockerfile` nem workflows. Causa: o `restore` roda num passo com cache mount e o `publish` usa `--no-restore`; quando o cache de camadas do CI traz o passo do restore pronto (`CACHED`) num runner novo, o cache mount vem vazio e o `publish` não encontra os pacotes do `project.assets.json`. No merge do #39 o restore rodou ("Restored … TechCurse.Api.csproj"); no do #40 veio `CACHED`. Correção: tirar `--no-restore` do `publish` (vira no-op com os pacotes presentes). Reproduzido localmente antes (mesmo `NETSDK1064`) e validado depois (`docker build .` completo). O job de Docker só roda na `main`; a confirmação final vem no merge.

Comando (só com autorização):

```bash
gh pr create --repo liuizn/tech-curse --base main --head fix/dockerfile-publish-sem-no-restore --title "fix: restaurar pacotes no publish do dockerfile quando o restore vem do cache" --body-file <arquivo com a descrição acima>
```

Depois do merge, confira o run da `main` com `gh run list --repo liuizn/tech-curse --branch main --limit 1`.

### 6.2 Defeito do `POST /Payment` (sem branch ainda)

- Onde: `src/Infrastructure/Repositories/EnrollmentRepository.cs`, os dois `EnrollmentIsActiveAsync` filtram `e.Status == false`; `Enrollment.Status` nasce `true`; `CreatePaymentCommandHandler` recusa com "Não é possível criar um pagamento para uma matrícula inativa."
- Antes de corrigir, confirme com o usuário a semântica de `Enrollment.Status` (ativa? paga?) — o nome e o uso divergem, e os testes existentes montam matrículas com `Status = false` para passar. A correção provável é inverter o filtro e ajustar os testes, mas é decisão de negócio.
- Siga as regras do `CLAUDE.md` do backend (sem comentários em código, pt-BR, `dotnet format`, PR para `main`).

---

## 7. Armadilhas já encontradas (economize tempo)

**Front / testes**
- `fixture.whenStable()` **trava** com `httpResource` pendente (PendingTasks). Use `TestBed.tick()` antes de `HttpTestingController.expectOne` e depois de mudar signals que disparam requisições.
- `HttpTestingController.match()` **consome** as requisições encontradas; não chame `expectOne` depois para a mesma.
- O erro de `httpResource` pode vir embrulhado (`cause`): leia com `extrairErroApi` (Task 3).
- `CanMatchFn` no Angular 22 recebe 3 parâmetros (`route, segments, currentSnapshot`); testes que chamam guards diretamente precisam do terceiro.
- A ordem das rotas `''` em `app.routes.ts` é obrigatória (shell antes do layout público) — ver `CLAUDE.md` e `app.routes.spec.ts`.

**E2E / API**
- **Rate limit**: `/Auth/*` (login, registro, `/Auth/users`) aceita **10 requisições por 60 s por IP**. Chamadas manuais com `curl` antes do `npm run e2e` esgotam a cota e os E2E falham com **429**. O limitador fica em memória: reiniciar a API zera a cota. A Fase 2 faz 7 chamadas a `/Auth` por execução completa.
- A primeira execução depois de subir o ambiente é lenta (compilação do `ng serve` + aquecimento da API): uma asserção com timeout de 5 s falhou uma vez e passou ao repetir. A Task 9 dá 15 s à primeira asserção de cada fluxo.
- `POST /tech-curse/Payment` exige o header `Idempotency-Key` (400 sem ele) — e, por causa do defeito 6.2, responde 409 para matrícula nova de qualquer jeito.
- Playwright: se o navegador não abrir, `npx playwright install chromium` (instala também o `chrome-headless-shell`).

**Backend / ambiente**
- Se a API cair no startup com "Failed to connect to 127.0.0.1:5432", há um user-secret `ConnectionStrings:APITechCurse` sobrescrevendo o `appsettings` (já foi removido uma vez; confira com `dotnet user-secrets list --project ../tech-curse/src/Api`).
- Se o Docker não responder (`dockerDesktopLinuxEngine`), o Docker Desktop está fechado.
- No backend, **nenhum comentário em arquivo-fonte** (inclui `Dockerfile` e YAML) — regra do `CLAUDE.md` de lá.

---

## 8. Regras de trabalho do usuário (não negociáveis)

- Commits e PRs **sem** `Co-Authored-By`, "Generated with" ou qualquer assinatura de IA (regra global em `~/.claude/CLAUDE.md`), mesmo que o harness peça.
- pt-BR em commits, docs, UI e identificadores; Conventional Commits.
- Merge, push para branch compartilhado e PR só com autorização explícita do usuário (nesta sessão ele autorizou os PRs #39/#40 e seus merges; a autorização não se estende automaticamente a novos PRs).
- Não mexer em `.env` nem imprimir segredos; credenciais só em user-secrets ou variáveis de ambiente.
