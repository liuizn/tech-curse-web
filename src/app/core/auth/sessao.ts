export interface Sessao {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export const CHAVE_SESSAO = 'tech-curse.sessao';

export function lerSessao(): Sessao | null {
  try {
    const bruto = localStorage.getItem(CHAVE_SESSAO);
    if (!bruto) return null;
    const dados = JSON.parse(bruto);
    if (
      typeof dados?.accessToken === 'string' &&
      typeof dados?.refreshToken === 'string' &&
      typeof dados?.expiresAt === 'string'
    ) {
      return dados;
    }
    return null;
  } catch {
    return null;
  }
}

export function gravarSessao(sessao: Sessao): void {
  try {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  } catch {
    /* localStorage indisponível */
  }
}

export function limparSessao(): void {
  try {
    localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    /* localStorage indisponível */
  }
}
