import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { MatriculaService } from './matricula.service';

describe('MatriculaService', () => {
  it('faz POST /Enrollment com courseId e studentId', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const backend = TestBed.inject(HttpTestingController);
    const promessa = TestBed.inject(MatriculaService).matricular(3, 9);
    const req = backend.expectOne(`${environment.apiUrl}/Enrollment`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ courseId: 3, studentId: 9 });
    req.flush(
      { mensagem: 'Aluno matriculado com sucesso.' },
      { status: 202, statusText: 'Accepted' },
    );
    await expect(promessa).resolves.toBeUndefined();
  });
});
