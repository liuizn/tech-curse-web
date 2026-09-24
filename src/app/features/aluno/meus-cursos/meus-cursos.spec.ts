import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';
import { MatriculaAluno } from '../../../core/api/modelos/aluno';
import { MeusCursosComponent } from './meus-cursos';

describe('MeusCursosComponent', () => {
  const carregando = signal(false);
  const erro = signal<unknown>(undefined);
  const valor = signal<MatriculaAluno[] | undefined>(undefined);
  const perfilAluno = {
    matriculasRecurso: { isLoading: carregando, error: erro, value: valor },
    recarregarMatriculas: vi.fn(),
  };
  let fixture: ComponentFixture<MeusCursosComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    carregando.set(false);
    erro.set(undefined);
    valor.set(undefined);
    perfilAluno.recarregarMatriculas.mockReset();
    await TestBed.configureTestingModule({
      imports: [MeusCursosComponent],
      providers: [provideRouter([]), { provide: PerfilAlunoService, useValue: perfilAluno }],
    }).compileComponents();
    fixture = TestBed.createComponent(MeusCursosComponent);
  });

  it('lista as matrículas com link e selo de situação', async () => {
    valor.set([
      {
        courseId: 1,
        titulo: 'Curso A',
        descricao: 'd',
        categoria: 'Front',
        matriculaAtiva: true,
        enrollmentId: 10,
      },
      {
        courseId: 2,
        titulo: 'Curso B',
        descricao: 'd',
        categoria: 'Back',
        matriculaAtiva: false,
        enrollmentId: 11,
      },
    ]);
    await fixture.whenStable();
    expect(el().querySelector('h1')?.textContent).toContain('Meus cursos');
    expect(el().querySelector('a[href="/cursos/1"]')?.textContent).toContain('Curso A');
    expect(el().textContent).toContain('Ativa');
    expect(el().textContent).toContain('Inativa');
  });

  it('vazio mostra mensagem e link para o catálogo', async () => {
    valor.set([]);
    await fixture.whenStable();
    expect(el().textContent).toContain('Você ainda não está matriculado em nenhum curso');
    expect(el().querySelector('a[href="/cursos"]')).not.toBeNull();
  });

  it('carregando mostra esqueleto', async () => {
    carregando.set(true);
    await fixture.whenStable();
    expect(el().querySelector('[data-teste="carregando"]')).not.toBeNull();
  });

  it('erro permite tentar de novo', async () => {
    erro.set(new Error('falhou'));
    await fixture.whenStable();
    el().querySelector<HTMLButtonElement>('button[data-teste="recarregar"]')!.click();
    expect(perfilAluno.recarregarMatriculas).toHaveBeenCalled();
  });
});
