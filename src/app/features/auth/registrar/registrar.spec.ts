import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AutenticacaoService, DadosRegistro } from '../../../core/auth/autenticacao.service';
import { ErroApi } from '../../../core/http/erro-api';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { RegistrarComponent } from './registrar';

describe('RegistrarComponent', () => {
  const auth = { registrar: vi.fn<(d: DadosRegistro) => Promise<void>>() };
  const notificacao = { sucesso: vi.fn(), erro: vi.fn(), info: vi.fn() };
  let fixture: ComponentFixture<RegistrarComponent>;
  let router: Router;

  beforeEach(async () => {
    auth.registrar.mockReset();
    notificacao.sucesso.mockReset();
    await TestBed.configureTestingModule({
      imports: [RegistrarComponent],
      providers: [
        provideRouter([]),
        { provide: AutenticacaoService, useValue: auth },
        { provide: NotificacaoService, useValue: notificacao },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(RegistrarComponent);
    await fixture.whenStable();
  });

  function preencher(valores: Record<string, string>): void {
    const el: HTMLElement = fixture.nativeElement;
    for (const [nome, valor] of Object.entries(valores)) {
      const campo = el.querySelector<HTMLInputElement>(`input[formControlName="${nome}"]`)!;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
    }
  }

  async function enviar(): Promise<void> {
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const dadosValidos = {
    nome: 'aluno',
    email: 'aluno@teste.dev',
    senha: 'Senha@123',
    confirmacaoSenha: 'Senha@123',
  };

  it('bloqueia senhas diferentes', async () => {
    preencher({ ...dadosValidos, confirmacaoSenha: 'Outra@123' });
    await enviar();
    expect(auth.registrar).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('As senhas não coincidem');
  });

  it('registra, notifica e vai para /entrar', async () => {
    auth.registrar.mockResolvedValue();
    preencher(dadosValidos);
    await enviar();
    expect(auth.registrar).toHaveBeenCalledWith(dadosValidos);
    expect(notificacao.sucesso).toHaveBeenCalledWith('Conta criada. Entre para continuar.');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/entrar');
  });

  it('distribui erros 422 nos campos', async () => {
    const erro: ErroApi = {
      status: 422,
      titulo: 'Erro de validação',
      detalhe: 'Ocorreram um ou mais erros de validação.',
      erros: {
        DuplicateEmail: ["O e-mail 'aluno@teste.dev' já está em uso."],
        PasswordRequiresDigit: ['A senha precisa de um dígito.'],
      },
    };
    auth.registrar.mockRejectedValue(erro);
    preencher(dadosValidos);
    await enviar();
    const texto = (fixture.nativeElement as HTMLElement).textContent;
    expect(texto).toContain("O e-mail 'aluno@teste.dev' já está em uso.");
    expect(texto).toContain('A senha precisa de um dígito.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
