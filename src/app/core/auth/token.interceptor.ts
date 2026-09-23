import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AutenticacaoService } from './autenticacao.service';

const ROTAS_SEM_RETRY = /\/Auth\/(login|register|refresh)$/;

function comToken<T>(req: HttpRequest<T>, token: string | null): HttpRequest<T> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  const auth = inject(AutenticacaoService);
  const router = inject(Router);

  return next(comToken(req, auth.accessToken())).pipe(
    catchError((erro: unknown) => {
      const ehNaoAutorizado = erro instanceof HttpErrorResponse && erro.status === 401;
      if (!ehNaoAutorizado || ROTAS_SEM_RETRY.test(req.url)) return throwError(() => erro);

      return from(auth.renovar()).pipe(
        catchError(() => {
          auth.sair(router.url === '/' ? undefined : router.url);
          return throwError(() => erro);
        }),
        switchMap(() => next(comToken(req, auth.accessToken()))),
      );
    }),
  );
};
