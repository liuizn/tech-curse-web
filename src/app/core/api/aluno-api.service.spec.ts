import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AlunoApiService } from './aluno-api.service';

describe('AlunoApiService', () => {
  it('faz PUT /Student/{id} com o nome', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const backend = TestBed.inject(HttpTestingController);
    const promessa = TestBed.inject(AlunoApiService).atualizarNome(4, 'Novo Nome');
    const req = backend.expectOne(`${environment.apiUrl}/Student/4`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nome: 'Novo Nome' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    await expect(promessa).resolves.toBeUndefined();
  });
});
