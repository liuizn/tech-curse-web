export type Role = 'Admin' | 'Instructor' | 'Student';

export interface Usuario {
  id: string;
  email: string;
  role: Role;
}

const ROLES: Role[] = ['Admin', 'Instructor', 'Student'];

const CLAIM_ID = [
  'nameid',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
  'sub',
];
const CLAIM_EMAIL = ['email', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
const CLAIM_ROLE = ['role', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

export function decodificarPayload(token: string): Record<string, unknown> | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const preenchido = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(
      Array.from(atob(preenchido), (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(
        '',
      ),
    );
    const payload = JSON.parse(json);
    return typeof payload === 'object' && payload !== null ? payload : null;
  } catch {
    return null;
  }
}

function primeiraClaim(payload: Record<string, unknown>, nomes: string[]): unknown {
  for (const nome of nomes) {
    if (payload[nome] !== undefined) return payload[nome];
  }
  return undefined;
}

export function extrairUsuario(token: string): Usuario | null {
  const payload = decodificarPayload(token);
  if (!payload) return null;
  const id = primeiraClaim(payload, CLAIM_ID);
  const email = primeiraClaim(payload, CLAIM_EMAIL);
  const roleBruta = primeiraClaim(payload, CLAIM_ROLE);
  const role = Array.isArray(roleBruta) ? roleBruta[0] : roleBruta;
  if (typeof id !== 'string' || typeof email !== 'string' || !ROLES.includes(role as Role)) {
    return null;
  }
  return { id, email, role: role as Role };
}
