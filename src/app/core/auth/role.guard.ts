import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { AutenticacaoService } from './autenticacao.service';
import { Role } from './jwt';

export function roleGuard(roles: Role[]): CanActivateFn & CanMatchFn {
  return () => {
    const auth = inject(AutenticacaoService);
    const router = inject(Router);
    const atual = auth.role();
    return atual !== null && roles.includes(atual)
      ? true
      : router.createUrlTree(['/sem-permissao']);
  };
}
