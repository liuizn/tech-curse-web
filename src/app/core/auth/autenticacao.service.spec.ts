import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AutenticacaoService } from './autenticacao.service';
import { CHAVE_SESSAO } from './sessao';

function montarToken(payload: object): string {
  const b64 = (v: string) => btoa(v).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64('{"alg":"HS256"}')}.${b64(JSON.stringify(payload))}.assinatura`;
}

const TOKEN_ALUNO = montarToken({ nameid: '1', email: 'aluno@teste.dev', role: 'Student' });
const FUTURO = new Date(Date.now() + 60_000).toISOString();
const PASSADO = new Date(Date.now() - 60_000).toISOString();

describe('AutenticacaoService', () => {
  let backend: HttpTestingController;

  function criar(): AutenticacaoService {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    backend = TestBed.inject(HttpTestingController);
    return TestBed.inject(AutenticacaoService);
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => backend.verify());

  it('começa sem sessão', () => {
    const servico = criar();
    expect(servico.estaAutenticado()).toBe(false);
    expect(servico.usuario()).toBeNull();
  });

  it('carrega a sessão gravada e expõe o usuário', () => {
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({ accessToken: TOKEN_ALUNO, refreshToken: 'r1', expiresAt: FUTURO }),
    );
    const servico = criar();
    expect(servico.estaAutenticado()).toBe(true);
    expect(servico.usuario()?.email).toBe('aluno@teste.dev');
    expect(servico.role()).toBe('Student');
  });

  it('considera sessão expirada como não autenticada, mas com refresh disponível', () => {
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({ accessToken: TOKEN_ALUNO, refreshToken: 'r1', expiresAt: PASSADO }),
    );
    const servico = criar();
    expect(servico.estaAutenticado()).toBe(false);
    expect(servico.possuiRefreshToken()).toBe(true);
  });

  it('entrar chama /Auth/login e persiste a sessão', async () => {
    const servico = criar();
    const promessa = servico.entrar('aluno@teste.dev', 'Senha@123');
    const req = backend.expectOne(`${environment.apiUrl}/Auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'aluno@teste.dev', password: 'Senha@123' });
    req.flush({ accessToken: TOKEN_ALUNO, refreshToken: 'r1', expiresAt: FUTURO });
    await promessa;
    expect(servico.estaAutenticado()).toBe(true);
    expect(JSON.parse(localStorage.getItem(CHAVE_SESSAO)!).refreshToken).toBe('r1');
  });

  it('registrar envia role Student', async () => {
    const servico = criar();
    const promessa = servico.registrar({
      nome: 'aluno',
      email: 'aluno@teste.dev',
      senha: 'Senha@123',
      confirmacaoSenha: 'Senha@123',
    });
    const req = backend.expectOne(`${environment.apiUrl}/Auth/register`);
    expect(req.request.body).toEqual({
      name: 'aluno',
      email: 'aluno@teste.dev',
      role: 'Student',
      password: 'Senha@123',
      confirmPassword: 'Senha@123',
    });
    req.flush(
      { mensagem: 'Usuário registrado com sucesso.' },
      { status: 201, statusText: 'Created' },
    );
    await promessa;
  });

  it('renovar concorrente dispara um único POST /Auth/refresh', async () => {
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({ accessToken: TOKEN_ALUNO, refreshToken: 'r1', expiresAt: PASSADO }),
    );
    const servico = criar();
    const p1 = servico.renovar();
    const p2 = servico.renovar();
    const req = backend.expectOne(`${environment.apiUrl}/Auth/refresh`);
    expect(req.request.body).toEqual({ accessToken: TOKEN_ALUNO, refreshToken: 'r1' });
    req.flush({ accessToken: TOKEN_ALUNO, refreshToken: 'r2', expiresAt: FUTURO });
    await Promise.all([p1, p2]);
    expect(servico.refreshToken()).toBe('r2');
    expect(servico.estaAutenticado()).toBe(true);
  });

  it('renovar rejeita quando não há sessão', async () => {
    const servico = criar();
    await expect(servico.renovar()).rejects.toThrow();
  });

  it('sair limpa a sessão e navega para /entrar com returnUrl', () => {
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({ accessToken: TOKEN_ALUNO, refreshToken: 'r1', expiresAt: FUTURO }),
    );
    const servico = criar();
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    servico.sair('/cursos');
    expect(servico.estaAutenticado()).toBe(false);
    expect(localStorage.getItem(CHAVE_SESSAO)).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/entrar'], { queryParams: { returnUrl: '/cursos' } });
  });

  it('propaga o erro HTTP de login', async () => {
    const servico = criar();
    const promessa = servico.entrar('x@y.z', 'errada');
    backend
      .expectOne(`${environment.apiUrl}/Auth/login`)
      .flush({ title: 'Credenciais inválidas' }, { status: 400, statusText: 'Bad Request' });
    await expect(promessa).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(servico.estaAutenticado()).toBe(false);
  });
});
