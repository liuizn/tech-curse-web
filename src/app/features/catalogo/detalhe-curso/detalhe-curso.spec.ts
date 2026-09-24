import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { EstadoPerfilAluno, PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';
import { PerfilAluno } from '../../../core/api/modelos/aluno';
import { MatriculaService } from '../../../core/api/matricula.service';
import { AutenticacaoService } from '../../../core/auth/autenticacao.service';
import { Role } from '../../../core/auth/jwt';
import { erroInterceptor } from '../../../core/http/erro.interceptor';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { DetalheCursoComponent } from './detalhe-curso';

describe('DetalheCursoComponent', () => {
  let backend: HttpTestingController;
  let fixture: ComponentFixture<DetalheCursoComponent>;
  const role = signal<Role | null>('Student');
  const estado = signal<EstadoPerfilAluno>('ativo');
  const perfil = signal<PerfilAluno | null>({
    id: 9,
    nome: 'Aluno',
    email: 'a@t.dev',
    dataCadastro: '2026-01-01',
  });
  const cursosMatriculados = signal<ReadonlySet<number>>(new Set());
  const matriculasCarregando = signal(false);
  const perfilAluno = {
    estado,
    perfil,
    cursosMatriculados,
    recarregarMatriculas: vi.fn(),
    matriculasRecurso: { isLoading: matriculasCarregando },
  };
  const matriculaService = { matricular: vi.fn<(c: number, s: number) => Promise<void>>() };
  const notificacao = { sucesso: vi.fn(), erro: vi.fn(), info: vi.fn() };
  const curso = {
    id: 5,
    titulo: 'Curso Cinco',
    descricao: 'Descrição longa',
    categoria: 'Tech',
    cargaHoraria: 12,
    dataCriacao: '2026-03-10T00:00:00Z',
  };
  const el = () => fixture.nativeElement as HTMLElement;

  async function montar(id = '5', responder = true): Promise<void> {
    fixture = TestBed.createComponent(DetalheCursoComponent);
    fixture.componentRef.setInput('id', id);
    TestBed.tick();
    if (responder) {
      backend.expectOne(`${environment.apiUrl}/Course/${id}`).flush(curso);
      await fixture.whenStable();
    }
  }

  beforeEach(async () => {
    role.set('Student');
    estado.set('ativo');
    cursosMatriculados.set(new Set());
    matriculasCarregando.set(false);
    perfilAluno.recarregarMatriculas.mockReset();
    matriculaService.matricular.mockReset();
    notificacao.sucesso.mockReset();
    await TestBed.configureTestingModule({
      imports: [DetalheCursoComponent],
      providers: [
        provideHttpClient(withInterceptors([erroInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AutenticacaoService, useValue: { role } },
        { provide: PerfilAlunoService, useValue: perfilAluno },
        { provide: MatriculaService, useValue: matriculaService },
        { provide: NotificacaoService, useValue: notificacao },
      ],
    }).compileComponents();
    backend = TestBed.inject(HttpTestingController);
  });

  it('mostra os dados do curso', async () => {
    await montar();
    expect(el().querySelector('h1')?.textContent).toContain('Curso Cinco');
    expect(el().textContent).toContain('12h');
    expect(el().textContent).toContain('10/03/2026');
    expect(el().querySelector('a[href="/cursos?categoria=Tech"]')).not.toBeNull();
  });

  it('aluno ativo e não matriculado se matricula', async () => {
    matriculaService.matricular.mockResolvedValue();
    await montar();
    el().querySelector<HTMLButtonElement>('button[data-teste="matricular"]')!.click();
    await fixture.whenStable();
    expect(matriculaService.matricular).toHaveBeenCalledWith(5, 9);
    expect(notificacao.sucesso).toHaveBeenCalledWith('Matrícula realizada');
    expect(perfilAluno.recarregarMatriculas).toHaveBeenCalled();
  });

  it('mantém o botão desabilitado até a recarga das matrículas terminar', async () => {
    matriculaService.matricular.mockImplementation(async () => {
      matriculasCarregando.set(true);
    });
    await montar();
    const botao = el().querySelector<HTMLButtonElement>('button[data-teste="matricular"]')!;
    botao.click();
    await fixture.whenStable();

    expect(perfilAluno.recarregarMatriculas).toHaveBeenCalled();
    expect(botao.disabled).toBe(true);

    matriculasCarregando.set(false);
    await fixture.whenStable();
    expect(botao.disabled).toBe(false);
  });

  it('falha na matrícula reabilita o botão e não recarrega', async () => {
    matriculaService.matricular.mockRejectedValue({
      status: 409,
      titulo: 'Conflito',
      detalhe: 'Já matriculado.',
    });
    await montar();
    const botao = el().querySelector<HTMLButtonElement>('button[data-teste="matricular"]')!;
    botao.click();
    await fixture.whenStable();
    expect(perfilAluno.recarregarMatriculas).not.toHaveBeenCalled();
    expect(botao.disabled).toBe(false);
  });

  it('aluno já matriculado vê o selo e o link para Meus cursos', async () => {
    cursosMatriculados.set(new Set([5]));
    await montar();
    expect(el().querySelector('button[data-teste="matricular"]')).toBeNull();
    expect(el().textContent).toContain('Você está matriculado');
    expect(el().querySelector('a[href="/aluno/matriculas"]')).not.toBeNull();
  });

  it('perfil pendente desabilita a matrícula e explica', async () => {
    estado.set('pendente');
    await montar();
    expect(el().querySelector<HTMLButtonElement>('button[data-teste="matricular"]')!.disabled).toBe(
      true,
    );
    expect(el().textContent).toContain('aguardando liberação por um administrador');
  });

  it('Admin não vê área de matrícula', async () => {
    role.set('Admin');
    estado.set('inativo');
    await montar();
    expect(el().querySelector('[data-teste="area-matricula"]')).toBeNull();
  });

  it('404 mostra Curso não encontrado', async () => {
    await montar('77', false);
    backend
      .expectOne(`${environment.apiUrl}/Course/77`)
      .flush({ title: 'Não encontrado', detail: 'x' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    expect(el().textContent).toContain('Curso não encontrado');
  });

  it('id inválido mostra Curso não encontrado sem chamar a API', async () => {
    await montar('abc', false);
    backend.expectNone(() => true);
    await fixture.whenStable();
    expect(el().textContent).toContain('Curso não encontrado');
  });
});
