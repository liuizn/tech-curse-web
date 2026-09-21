import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AutenticacaoService } from '../../../core/auth/autenticacao.service';
import { Role } from '../../../core/auth/jwt';
import { ErroApi } from '../../../core/http/erro-api';
import { EntrarComponent } from './entrar';

describe('EntrarComponent', () => {
  const role = signal<Role | null>('Student');
  const auth = { entrar: vi.fn<(e: string, s: string) => Promise<void>>(), role };
  let fixture: ComponentFixture<EntrarComponent>;
  let router: Router;
  let queryParams: Record<string, string>;

  async function montar(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [EntrarComponent],
      providers: [
        provideRouter([]),
        { provide: AutenticacaoService, useValue: auth },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(EntrarComponent);
    await fixture.whenStable();
  }

  function preencher(email: string, senha: string): void {
    const el: HTMLElement = fixture.nativeElement;
    const campoEmail = el.querySelector<HTMLInputElement>('input[formControlName="email"]')!;
    const campoSenha = el.querySelector<HTMLInputElement>('input[formControlName="senha"]')!;
    campoEmail.value = email;
    campoEmail.dispatchEvent(new Event('input'));
    campoSenha.value = senha;
    campoSenha.dispatchEvent(new Event('input'));
  }

  async function enviar(): Promise<void> {
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  beforeEach(() => {
    auth.entrar.mockReset();
    role.set('Student');
    queryParams = {};
  });

  it('não envia com formulário inválido', async () => {
    await montar();
    preencher('nao-e-email', '');
    await enviar();
    expect(auth.entrar).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Informe um e-mail válido',
    );
  });

  it('entra e navega para a rota inicial da role', async () => {
    auth.entrar.mockResolvedValue();
    await montar();
    preencher('aluno@teste.dev', 'Senha@123');
    await enviar();
    expect(auth.entrar).toHaveBeenCalledWith('aluno@teste.dev', 'Senha@123');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/cursos');
  });

  it('respeita returnUrl', async () => {
    auth.entrar.mockResolvedValue();
    queryParams = { returnUrl: '/cursos?pagina=2' };
    await montar();
    preencher('aluno@teste.dev', 'Senha@123');
    await enviar();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/cursos?pagina=2');
  });

  it('mostra o detalhe do erro da API', async () => {
    const erro: ErroApi = {
      status: 400,
      titulo: 'Credenciais inválidas',
      detalhe: 'E-mail ou senha incorretos.',
    };
    auth.entrar.mockRejectedValue(erro);
    await montar();
    preencher('aluno@teste.dev', 'errada');
    await enviar();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'E-mail ou senha incorretos.',
    );
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
