import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CursoService } from './curso.service';
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
});
