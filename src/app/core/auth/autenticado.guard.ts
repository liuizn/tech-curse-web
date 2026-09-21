import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AutenticacaoService } from './autenticacao.service';

export const autenticadoGuard: CanActivateFn = async (_rota, estado) => {
  const auth = inject(AutenticacaoService);
  const router = inject(Router);

  if (auth.estaAutenticado()) return true;

  if (auth.possuiRefreshToken()) {
    try {
      await auth.renovar();
      if (auth.estaAutenticado()) return true;
    } catch {
      auth.encerrarSessao();
    }
  }

  return router.createUrlTree(['/entrar'], { queryParams: { returnUrl: estado.url } });
};
