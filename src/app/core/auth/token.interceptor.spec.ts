import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AutenticacaoService } from './autenticacao.service';
import { tokenInterceptor } from './token.interceptor';

describe('tokenInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const token = signal<string | null>('t1');
  const auth = {
    accessToken: token,
    renovar: vi.fn<() => Promise<void>>(),
    sair: vi.fn(),
  };

  beforeEach(() => {
    token.set('t1');
    auth.renovar.mockReset();
    auth.sair.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tokenInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AutenticacaoService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('anexa Bearer só em chamadas para a API', () => {
    http.get(`${environment.apiUrl}/Course`).subscribe();
    http.get('https://outro.dev/x').subscribe();
    expect(
      backend.expectOne(`${environment.apiUrl}/Course`).request.headers.get('Authorization'),
    ).toBe('Bearer t1');
    expect(backend.expectOne('https://outro.dev/x').request.headers.has('Authorization')).toBe(
      false,
    );
    backend.match(() => true).forEach((r) => r.flush({}));
  });

  it('não anexa header sem token', () => {
    token.set(null);
    http.get(`${environment.apiUrl}/Course`).subscribe();
    const req = backend.expectOne(`${environment.apiUrl}/Course`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('em 401 renova e repete uma vez com o novo token', async () => {
    auth.renovar.mockImplementation(async () => token.set('t2'));
    const resultado = new Promise((resolve) =>
      http.get(`${environment.apiUrl}/Course`).subscribe(resolve),
    );
    backend
      .expectOne(`${environment.apiUrl}/Course`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    let repetida: TestRequest | undefined;
    await vi.waitFor(() => {
      const matches = backend.match(`${environment.apiUrl}/Course`);
      expect(matches.length).toBe(1);
      repetida = matches[0];
    });
    expect(repetida!.request.headers.get('Authorization')).toBe('Bearer t2');
    repetida!.flush({ ok: true });
    expect(await resultado).toEqual({ ok: true });
    expect(auth.renovar).toHaveBeenCalledTimes(1);
  });

  it('se o refresh falha, chama sair e propaga o 401', async () => {
    auth.renovar.mockRejectedValue(new Error('refresh inválido'));
    const erro = new Promise<{ status: number }>((resolve) =>
      http.get(`${environment.apiUrl}/Course`).subscribe({ error: resolve }),
    );
    backend
      .expectOne(`${environment.apiUrl}/Course`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect((await erro).status).toBe(401);
    expect(auth.sair).toHaveBeenCalledTimes(1);
  });

  it('não tenta refresh em 401 de /Auth/login', async () => {
    const erro = new Promise<{ status: number }>((resolve) =>
      http.post(`${environment.apiUrl}/Auth/login`, {}).subscribe({ error: resolve }),
    );
    backend
      .expectOne(`${environment.apiUrl}/Auth/login`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect((await erro).status).toBe(401);
    expect(auth.renovar).not.toHaveBeenCalled();
    expect(auth.sair).not.toHaveBeenCalled();
  });
});
