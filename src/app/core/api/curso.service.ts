import { HttpResourceRef, httpResource } from '@angular/common/http';
import { Injectable, Signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Curso } from './modelos/curso';
import { ParametrosPaginacao, ResultadoPaginado } from './modelos/paginacao';

export type OrdemCursos = 'recentes' | 'titulo-asc' | 'titulo-desc' | 'categoria';

export const ORDEM_PADRAO: OrdemCursos = 'recentes';

const ORDENACAO_NA_API: Record<OrdemCursos, { sortBy: string; sortDirection: 'asc' | 'desc' }> = {
  recentes: { sortBy: 'datacriacao', sortDirection: 'desc' },
  'titulo-asc': { sortBy: 'titulo', sortDirection: 'asc' },
  'titulo-desc': { sortBy: 'titulo', sortDirection: 'desc' },
  categoria: { sortBy: 'categoria', sortDirection: 'asc' },
};

export function ehOrdemCursos(valor: unknown): valor is OrdemCursos {
  return typeof valor === 'string' && valor in ORDENACAO_NA_API;
}

export type ParametrosCatalogo = ParametrosPaginacao & {
  ordem?: OrdemCursos;
  categoria?: string | null;
};

@Injectable({ providedIn: 'root' })
export class CursoService {
  listar(
    parametros: Signal<ParametrosCatalogo>,
  ): HttpResourceRef<ResultadoPaginado<Curso> | undefined> {
    return httpResource<ResultadoPaginado<Curso>>(() => {
      const { pagina, tamanho, ordem, categoria } = parametros();
      const ordenacao = ORDENACAO_NA_API[ordem ?? ORDEM_PADRAO];
      const params: Record<string, string | number> = {
        PageNumber: pagina,
        PageSize: tamanho,
        SortBy: ordenacao.sortBy,
        SortDirection: ordenacao.sortDirection,
      };
      if (categoria) params['Categoria'] = categoria;
      return { url: `${environment.apiUrl}/Course`, params };
    });
  }

  obter(id: Signal<number | null>): HttpResourceRef<Curso | undefined> {
    return httpResource<Curso>(() => {
      const valor = id();
      return valor === null ? undefined : `${environment.apiUrl}/Course/${valor}`;
    });
  }
}
