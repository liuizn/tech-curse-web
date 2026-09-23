import { Role } from './jwt';

export function rotaInicialPorRole(role: Role | null): string {
  return role === 'Admin' || role === 'Instructor' ? '/admin' : '/cursos';
}
