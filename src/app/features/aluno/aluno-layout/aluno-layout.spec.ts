import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EstadoPerfilAluno, PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';
import { AlunoLayoutComponent } from './aluno-layout';

describe('AlunoLayoutComponent', () => {
  const estado = signal<EstadoPerfilAluno>('carregando');
  const perfilAluno = { estado, recarregarPerfil: vi.fn() };
  let fixture: ComponentFixture<AlunoLayoutComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    perfilAluno.recarregarPerfil.mockReset();
    await TestBed.configureTestingModule({
      imports: [AlunoLayoutComponent],
      providers: [provideRouter([]), { provide: PerfilAlunoService, useValue: perfilAluno }],
    }).compileComponents();
    fixture = TestBed.createComponent(AlunoLayoutComponent);
  });

  it('carregando mostra esqueleto', async () => {
    estado.set('carregando');
    await fixture.whenStable();
    expect(el().querySelector('[data-teste="carregando"]')).not.toBeNull();
  });

  it('pendente mostra o aviso e o link para o catálogo', async () => {
    estado.set('pendente');
    await fixture.whenStable();
    expect(el().textContent).toContain(
      'Seu cadastro está aguardando liberação por um administrador',
    );
    expect(el().querySelector('a[href="/cursos"]')).not.toBeNull();
    expect(el().querySelector('router-outlet')).toBeNull();
  });

  it('erro permite tentar de novo', async () => {
    estado.set('erro');
    await fixture.whenStable();
    expect(el().textContent).toContain('Não foi possível carregar seu perfil');
    el().querySelector<HTMLButtonElement>('button[data-teste="recarregar"]')!.click();
    expect(perfilAluno.recarregarPerfil).toHaveBeenCalled();
  });

  it('ativo mostra o conteúdo', async () => {
    estado.set('ativo');
    await fixture.whenStable();
    expect(el().querySelector('router-outlet')).not.toBeNull();
  });
});
