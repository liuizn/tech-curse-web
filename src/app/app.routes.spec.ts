import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { AutenticacaoService } from './core/auth/autenticacao.service';
import { Role, Usuario } from './core/auth/jwt';

describe('app.routes', () => {
  const estaAutenticado = signal(false);
  const possuiRefreshToken = signal(false);
  const role = signal<Role | null>(null);
  const usuario = signal<Usuario | null>(null);
  const auth = {
    estaAutenticado,
    possuiRefreshToken,
    role,
    usuario,
    renovar: vi.fn(),
    sair: vi.fn(),
    encerrarSessao: vi.fn(),
  };

  function autenticarComo(papel: Role): void {
    estaAutenticado.set(true);
    role.set(papel);
    usuario.set({ id: '1', email: `${papel.toLowerCase()}@teste.dev`, role: papel });
  }

  beforeEach(() => {
    estaAutenticado.set(false);
    possuiRefreshToken.set(false);
    role.set(null);
    usuario.set(null);
    auth.renovar.mockReset();
    auth.sair.mockReset();
    auth.encerrarSessao.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AutenticacaoService, useValue: auth },
      ],
    });
  });

  it('anônimo em / é redirecionado para /entrar com returnUrl para /cursos', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    const router = TestBed.inject(Router);
    expect(router.url).toBe('/entrar?returnUrl=%2Fcursos');
  });

  it('Student autenticado em / cai em /cursos', async () => {
    autenticarComo('Student');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    const router = TestBed.inject(Router);
    expect(router.url).toBe('/cursos');
  });

  it('Student autenticado em /entrar cai em /cursos', async () => {
    autenticarComo('Student');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/entrar');
    const router = TestBed.inject(Router);
    expect(router.url).toBe('/cursos');
  });

  it('Admin autenticado em /entrar cai em /admin', async () => {
    autenticarComo('Admin');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/entrar');
    const router = TestBed.inject(Router);
    expect(router.url).toBe('/admin');
  });

  it('anônimo em /admin é redirecionado para /entrar com returnUrl para /admin', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin');
    const router = TestBed.inject(Router);
    expect(router.url).toBe('/entrar?returnUrl=%2Fadmin');
  });

  it('Student autenticado em /admin cai em /sem-permissao', async () => {
    autenticarComo('Student');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin');
    const router = TestBed.inject(Router);
    expect(router.url).toBe('/sem-permissao');
  });

  it('Student em /aluno vai para /aluno/matriculas', async () => {
    autenticarComo('Student');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/aluno');
    expect(TestBed.inject(Router).url).toBe('/aluno/matriculas');
  });

  it('/cursos/1 abre o detalhe do curso', async () => {
    autenticarComo('Student');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/cursos/1');
    expect(TestBed.inject(Router).url).toBe('/cursos/1');
    expect(harness.routeNativeElement?.textContent).toContain('Voltar ao catálogo');
  });

  it('rota inexistente ativa NaoEncontradoComponent', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/nao-existe');
    const router = TestBed.inject(Router);
    expect(router.url).toBe('/nao-existe');
    expect((harness.routeNativeElement as HTMLElement).textContent).toContain(
      'Página não encontrada',
    );
  });
});
