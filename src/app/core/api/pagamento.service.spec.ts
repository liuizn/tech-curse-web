import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ParametrosPaginacao } from './modelos/paginacao';
import { PagamentoService } from './pagamento.service';

describe('PagamentoService', () => {
  it('não busca sem studentId e busca com paginação quando o id chega', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
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
    req.flush({
      items: [],
      pageNumber: 2,
      pageSize: 10,
      totalCount: 0,
      totalPages: 0,
      hasPreviousPage: true,
      hasNextPage: false,
    });
    await TestBed.tick();
    expect(recurso.value()?.pageNumber).toBe(2);
  });
});
