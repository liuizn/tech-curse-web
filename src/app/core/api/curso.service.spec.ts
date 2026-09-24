import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CursoService, ehOrdemCursos } from './curso.service';
import { ParametrosPaginacao } from './modelos/paginacao';

describe('CursoService', () => {
  it('lista cursos com PageNumber e PageSize na query', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const backend = TestBed.inject(HttpTestingController);
    const servico = TestBed.inject(CursoService);
    const parametros = signal<ParametrosPaginacao>({ pagina: 2, tamanho: 10 });

    const recurso = TestBed.runInInjectionContext(() => servico.listar(parametros));
    await TestBed.tick();

    const req = backend.expectOne((r) => r.url === `${environment.apiUrl}/Course`);
    expect(req.request.params.get('PageNumber')).toBe('2');
    expect(req.request.params.get('PageSize')).toBe('10');
    req.flush({
      items: [
        {
          id: 1,
          titulo: 'Angular',
          descricao: 'd',
          categoria: 'Front',
          cargaHoraria: 10,
          dataCriacao: '2026-01-01',
        },
      ],
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

  function configurar() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return {
      backend: TestBed.inject(HttpTestingController),
      servico: TestBed.inject(CursoService),
    };
  }

  it('usa "recentes" como ordem padrão e não manda Categoria vazia', async () => {
    const { backend, servico } = configurar();
    TestBed.runInInjectionContext(() => servico.listar(signal({ pagina: 1, tamanho: 12 })));
    await TestBed.tick();
    const req = backend.expectOne((r) => r.url === `${environment.apiUrl}/Course`);
    expect(req.request.params.get('SortBy')).toBe('datacriacao');
    expect(req.request.params.get('SortDirection')).toBe('desc');
    expect(req.request.params.has('Categoria')).toBe(false);
    req.flush({
      items: [],
      pageNumber: 1,
      pageSize: 12,
      totalCount: 0,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    });
  });

  it('traduz ordem e categoria para os parâmetros da API', async () => {
    const { backend, servico } = configurar();
    TestBed.runInInjectionContext(() =>
      servico.listar(
        signal({ pagina: 1, tamanho: 12, ordem: 'titulo-desc' as const, categoria: 'Front' }),
      ),
    );
    await TestBed.tick();
    const req = backend.expectOne((r) => r.url === `${environment.apiUrl}/Course`);
    expect(req.request.params.get('SortBy')).toBe('titulo');
    expect(req.request.params.get('SortDirection')).toBe('desc');
    expect(req.request.params.get('Categoria')).toBe('Front');
    req.flush({
      items: [],
      pageNumber: 1,
      pageSize: 12,
      totalCount: 0,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    });
  });

  it('obter busca o curso pelo id e não faz requisição com id nulo', async () => {
    const { backend, servico } = configurar();
    const id = signal<number | null>(null);
    const recurso = TestBed.runInInjectionContext(() => servico.obter(id));
    await TestBed.tick();
    backend.expectNone(() => true);
    id.set(7);
    await TestBed.tick();
    backend.expectOne(`${environment.apiUrl}/Course/7`).flush({
      id: 7,
      titulo: 'Curso 7',
      descricao: 'd',
      categoria: 'Tech',
      cargaHoraria: 4,
      dataCriacao: '2026-01-01',
    });
    await TestBed.tick();
    expect(recurso.value()?.titulo).toBe('Curso 7');
  });

  it('ehOrdemCursos só aceita as quatro ordens', () => {
    expect(ehOrdemCursos('titulo-asc')).toBe(true);
    expect(ehOrdemCursos('preco')).toBe(false);
    expect(ehOrdemCursos(undefined)).toBe(false);
  });
});
