export interface ErroApi {
  status: number;
  titulo: string;
  detalhe: string;
  erros?: Record<string, string[]>;
}

export function ehErroApi(valor: unknown): valor is ErroApi {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    typeof (valor as ErroApi).status === 'number' &&
    typeof (valor as ErroApi).detalhe === 'string'
  );
}
