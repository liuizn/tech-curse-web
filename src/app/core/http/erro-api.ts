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

export function extrairErroApi(erro: unknown): ErroApi | null {
  if (ehErroApi(erro)) return erro;
  const causa =
    typeof erro === 'object' && erro !== null ? (erro as { cause?: unknown }).cause : undefined;
  return ehErroApi(causa) ? causa : null;
}
