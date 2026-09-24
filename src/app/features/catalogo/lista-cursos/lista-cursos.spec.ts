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
    for (const [nome, valor] of Object.entries(entradas))
      fixture.componentRef.setInput(nome, valor);
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
    requisicao().flush(
      { title: 'Erro', detail: 'Falha ao listar.' },
      { status: 500, statusText: 'Server Error' },
    );
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
      expect.objectContaining({
        queryParams: { ordem: 'titulo-desc', pagina: null },
        queryParamsHandling: 'merge',
      }),
    );
  });

  it('clicar na categoria filtra e o chip limpa o filtro', async () => {
    await montar();
    requisicao().flush(pagina([curso(1, 'A', 'Dados')], 1));
    await fixture.whenStable();
    el().querySelector<HTMLButtonElement>('button[data-teste="categoria-1"]')!.click();
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { categoria: 'Dados', pagina: null },
        queryParamsHandling: 'merge',
      }),
    );
  });

  it('o chip remove a categoria da query string', async () => {
    await montar({ categoria: 'Dados' });
    requisicao().flush(pagina([curso(1, 'A', 'Dados')], 1));
    await fixture.whenStable();
    el().querySelector<HTMLButtonElement>('[data-teste="chip-categoria"] button')!.click();
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { categoria: null, pagina: null },
        queryParamsHandling: 'merge',
      }),
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
