import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { anonimoGuard } from './anonimo.guard';
import { autenticadoGuard } from './autenticado.guard';
import { AutenticacaoService } from './autenticacao.service';
import { Role } from './jwt';
import { roleGuard } from './role.guard';

describe('guards', () => {
  const estaAutenticado = signal(false);
  const possuiRefreshToken = signal(false);
  const role = signal<Role | null>(null);
  const auth = { estaAutenticado, possuiRefreshToken, role, renovar: vi.fn<() => Promise<void>>() };
  let router: Router;

  const snapshot = {} as ActivatedRouteSnapshot;
  const estado = (url: string) => ({ url }) as RouterStateSnapshot;

  beforeEach(() => {
    estaAutenticado.set(false);
    possuiRefreshToken.set(false);
    role.set(null);
    auth.renovar.mockReset();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AutenticacaoService, useValue: auth }],
    });
    router = TestBed.inject(Router);
  });

  const rodar = <T>(fn: () => T) => TestBed.runInInjectionContext(fn);

  describe('autenticadoGuard', () => {
    it('libera quando autenticado', async () => {
      estaAutenticado.set(true);
      expect(await rodar(() => autenticadoGuard(snapshot, estado('/cursos')))).toBe(true);
    });

    it('tenta renovar quando expirado com refresh disponível', async () => {
      possuiRefreshToken.set(true);
      auth.renovar.mockImplementation(async () => estaAutenticado.set(true));
      expect(await rodar(() => autenticadoGuard(snapshot, estado('/cursos')))).toBe(true);
      expect(auth.renovar).toHaveBeenCalledTimes(1);
    });

    it('redireciona para /entrar com returnUrl quando não autenticado', async () => {
      const resultado = (await rodar(() =>
        autenticadoGuard(snapshot, estado('/cursos')),
      )) as UrlTree;
      expect(router.serializeUrl(resultado)).toBe('/entrar?returnUrl=%2Fcursos');
    });
  });

  describe('roleGuard', () => {
    it('libera role permitida', () => {
      role.set('Admin');
      expect(rodar(() => roleGuard(['Admin', 'Instructor'])(snapshot, estado('/admin')))).toBe(
        true,
      );
    });

    it('redireciona para /sem-permissao', () => {
      role.set('Student');
      const resultado = rodar(() => roleGuard(['Admin'])(snapshot, estado('/admin'))) as UrlTree;
      expect(router.serializeUrl(resultado)).toBe('/sem-permissao');
    });
  });

  describe('anonimoGuard', () => {
    it('libera quando não autenticado', () => {
      expect(rodar(() => anonimoGuard(snapshot, estado('/entrar')))).toBe(true);
    });

    it('redireciona para a rota inicial da role quando autenticado', () => {
      estaAutenticado.set(true);
      role.set('Admin');
      const resultado = rodar(() => anonimoGuard(snapshot, estado('/entrar'))) as UrlTree;
      expect(router.serializeUrl(resultado)).toBe('/admin');
    });
  });
});
