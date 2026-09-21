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
    TestBed.tick();
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
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[data-teste="carregando"]'),
    ).not.toBeNull();
    backend
      .expectOne((r) => r.url === `${environment.apiUrl}/Course`)
      .flush(
        pagina(
          [
            {
              id: 1,
              titulo: 'Angular 22',
              descricao: 'Signals',
              categoria: 'Front',
              cargaHoraria: 8,
              dataCriacao: '2026-01-01',
            },
          ],
          1,
        ),
      );
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
      .flush(
        { title: 'Erro', detail: 'Falha ao listar.' },
        { status: 500, statusText: 'Server Error' },
      );
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Não foi possível carregar os cursos',
    );
    expect(notificacao.erro).toHaveBeenCalledWith('Falha ao listar.');
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[data-teste="recarregar"]')!
      .click();
    TestBed.tick();
    backend.expectOne((r) => r.url === `${environment.apiUrl}/Course`).flush(pagina([], 0));
  });
});
