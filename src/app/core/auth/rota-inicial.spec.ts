import { rotaInicialPorRole } from './rota-inicial';

describe('rotaInicialPorRole', () => {
  it('manda aluno para /cursos', () => expect(rotaInicialPorRole('Student')).toBe('/cursos'));
  it('manda admin e instrutor para /admin', () => {
    expect(rotaInicialPorRole('Admin')).toBe('/admin');
    expect(rotaInicialPorRole('Instructor')).toBe('/admin');
  });
  it('sem role cai em /cursos', () => expect(rotaInicialPorRole(null)).toBe('/cursos'));
});
