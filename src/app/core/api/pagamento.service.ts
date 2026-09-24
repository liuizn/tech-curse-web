import { HttpResourceRef, httpResource } from '@angular/common/http';
import { Injectable, Signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Pagamento } from './modelos/pagamento';
import { ParametrosPaginacao, ResultadoPaginado } from './modelos/paginacao';

@Injectable({ providedIn: 'root' })
export class PagamentoService {
  listarDoAluno(
    studentId: Signal<number | null>,
    parametros: Signal<ParametrosPaginacao>,
  ): HttpResourceRef<ResultadoPaginado<Pagamento> | undefined> {
    return httpResource<ResultadoPaginado<Pagamento>>(() => {
      const id = studentId();
      if (id === null) return undefined;
      const { pagina, tamanho } = parametros();
      return {
        url: `${environment.apiUrl}/Payment/student/${id}`,
        params: { PageNumber: pagina, PageSize: tamanho },
      };
    });
  }
}
