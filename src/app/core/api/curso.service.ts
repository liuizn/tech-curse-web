import { HttpResourceRef, httpResource } from '@angular/common/http';
import { Injectable, Signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Curso } from './modelos/curso';
import { ParametrosPaginacao, ResultadoPaginado } from './modelos/paginacao';

@Injectable({ providedIn: 'root' })
export class CursoService {
  listar(
    parametros: Signal<ParametrosPaginacao>,
  ): HttpResourceRef<ResultadoPaginado<Curso> | undefined> {
    return httpResource<ResultadoPaginado<Curso>>(() => ({
      url: `${environment.apiUrl}/Course`,
      params: { PageNumber: parametros().pagina, PageSize: parametros().tamanho },
    }));
  }
}
