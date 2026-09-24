import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AutenticacaoService } from '../auth/autenticacao.service';
import { Role } from '../auth/jwt';
import { erroInterceptor } from '../http/erro.interceptor';
import { NotificacaoService } from '../notificacao/notificacao.service';
import { PerfilAlunoService } from './perfil-aluno.service';

describe('PerfilAlunoService', () => {
  const role = signal<Role | null>(null);
  const notificacao = { sucesso: vi.fn(), erro: vi.fn(), info: vi.fn() };
  let backend: HttpTestingController;
  let servico: PerfilAlunoService;
  const perfil = {
    id: 3,
    nome: 'Aluno',
    email: 'aluno@teste.dev',
    dataCadastro: '2026-09-01T00:00:00Z',
  };
  const matriculas = [
    {
      courseId: 10,
      titulo: 'A',
      descricao: 'd',
      categoria: 'Front',
      matriculaAtiva: true,
      enrollmentId: 100,
    },
    {
      courseId: 11,
      titulo: 'B',
      descricao: 'd',
      categoria: 'Back',
      matriculaAtiva: false,
      enrollmentId: 101,
    },
  ];

  beforeEach(() => {
    role.set(null);
    notificacao.erro.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([erroInterceptor])),
        provideHttpClientTesting(),
        { provide: AutenticacaoService, useValue: { role } },
        { provide: NotificacaoService, useValue: notificacao },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    servico = TestBed.inject(PerfilAlunoService);
  });

  afterEach(() => backend.verify());

  it('fica inativo e não chama /me para quem não é aluno', async () => {
    role.set('Admin');
    await TestBed.tick();
    backend.expectNone(`${environment.apiUrl}/Student/me`);
    expect(servico.estado()).toBe('inativo');
    expect(servico.perfil()).toBeNull();
  });

  it('carrega o perfil e depois as matrículas', async () => {
    role.set('Student');
    await TestBed.tick();
    expect(servico.estado()).toBe('carregando');
    backend.expectOne(`${environment.apiUrl}/Student/me`).flush(perfil);
    await TestBed.tick();
    expect(servico.estado()).toBe('ativo');
    expect(servico.perfil()?.id).toBe(3);
    await TestBed.tick();
    backend.expectOne(`${environment.apiUrl}/Student/3/enrollments`).flush(matriculas);
    await TestBed.tick();
    expect(servico.matriculas()).toHaveLength(2);
    expect(servico.cursosMatriculados().has(10)).toBe(true);
    expect(servico.cursosMatriculados().has(99)).toBe(false);
  });

  it('404 no /me vira pendente, sem toast e sem buscar matrículas', async () => {
    role.set('Student');
    await TestBed.tick();
    backend
      .expectOne(`${environment.apiUrl}/Student/me`)
      .flush(
        { title: 'Não encontrado', detail: 'Perfil não encontrado.' },
        { status: 404, statusText: 'Not Found' },
      );
    await TestBed.tick();
    expect(servico.estado()).toBe('pendente');
    expect(notificacao.erro).not.toHaveBeenCalled();
    backend.expectNone((r) => r.url.includes('/enrollments'));
  });

  it('500 no /me vira erro', async () => {
    role.set('Student');
    await TestBed.tick();
    backend
      .expectOne(`${environment.apiUrl}/Student/me`)
      .flush({ detail: 'Falhou.' }, { status: 500, statusText: 'Server Error' });
    await TestBed.tick();
    expect(servico.estado()).toBe('erro');
  });

  it('volta a inativo quando a role deixa de ser Student', async () => {
    role.set('Student');
    await TestBed.tick();
    backend.expectOne(`${environment.apiUrl}/Student/me`).flush(perfil);
    await TestBed.tick();
    await TestBed.tick();
    backend.expectOne(`${environment.apiUrl}/Student/3/enrollments`).flush(matriculas);
    await TestBed.tick();
    role.set(null);
    await TestBed.tick();
    expect(servico.estado()).toBe('inativo');
    expect(servico.perfil()).toBeNull();
    expect(servico.matriculas()).toEqual([]);
  });

  it('recarregarMatriculas busca de novo', async () => {
    role.set('Student');
    await TestBed.tick();
    backend.expectOne(`${environment.apiUrl}/Student/me`).flush(perfil);
    await TestBed.tick();
    await TestBed.tick();
    backend.expectOne(`${environment.apiUrl}/Student/3/enrollments`).flush([]);
    await TestBed.tick();
    servico.recarregarMatriculas();
    await TestBed.tick();
    backend.expectOne(`${environment.apiUrl}/Student/3/enrollments`).flush(matriculas);
    await TestBed.tick();
    expect(servico.matriculas()).toHaveLength(2);
  });
});
