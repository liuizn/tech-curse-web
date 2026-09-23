export interface ResultadoPaginado<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ParametrosPaginacao {
  pagina: number;
  tamanho: number;
}
