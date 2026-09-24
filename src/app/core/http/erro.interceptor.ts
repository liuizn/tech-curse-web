import { inject } from '@angular/core';
import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { NotificacaoService } from '../notificacao/notificacao.service';
import { ErroApi } from './erro-api';

export const SILENCIAR_ERRO = new HttpContextToken<boolean>(() => false);

const TITULOS_POR_STATUS: Record<number, string> = {
  400: 'Requisição inválida',
  401: 'Não autenticado',
  403: 'Acesso negado',
  404: 'Não encontrado',
  409: 'Conflito',
  422: 'Erro de validação',
  429: 'Muitas requisições',
  504: 'Tempo esgotado',
};

interface ProblemDetails {
  status?: number;
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

function ehProblemDetails(corpo: unknown): corpo is ProblemDetails {
  return typeof corpo === 'object' && corpo !== null && ('title' in corpo || 'detail' in corpo);
}

export function converterErro(resposta: HttpErrorResponse): ErroApi {
  if (resposta.status === 0) {
    return { status: 0, titulo: 'Sem conexão', detalhe: 'Não foi possível conectar ao servidor.' };
  }
  const corpo = resposta.error;
  if (ehProblemDetails(corpo)) {
    return {
      status: resposta.status,
      titulo: corpo.title ?? TITULOS_POR_STATUS[resposta.status] ?? 'Erro inesperado',
      detalhe: corpo.detail ?? 'Ocorreu um erro inesperado. Tente novamente.',
      ...(corpo.errors ? { erros: corpo.errors } : {}),
    };
  }
  return {
    status: resposta.status,
    titulo: TITULOS_POR_STATUS[resposta.status] ?? 'Erro inesperado',
    detalhe: 'Ocorreu um erro inesperado. Tente novamente.',
  };
}

const STATUS_TRATADOS_LOCALMENTE = new Set([400, 401, 422]);

export const erroInterceptor: HttpInterceptorFn = (req, next) => {
  const notificacao = inject(NotificacaoService);
  return next(req).pipe(
    catchError((erro: unknown) => {
      if (!(erro instanceof HttpErrorResponse)) return throwError(() => erro);
      const erroApi = converterErro(erro);
      if (!STATUS_TRATADOS_LOCALMENTE.has(erroApi.status) && !req.context.get(SILENCIAR_ERRO)) {
        notificacao.erro(erroApi.detalhe);
      }
      return throwError(() => erroApi);
    }),
  );
};
