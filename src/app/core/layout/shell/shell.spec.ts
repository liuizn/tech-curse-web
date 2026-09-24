import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AutenticacaoService } from '../../auth/autenticacao.service';
import { Role, Usuario } from '../../auth/jwt';
import { ShellComponent } from './shell';

describe('ShellComponent', () => {
  const usuario = signal<Usuario | null>({ id: '1', email: 'aluno@teste.dev', role: 'Student' });
  const role = signal<Role | null>('Student');
  const auth = { usuario, role, sair: vi.fn() };

  beforeEach(async () => {
    auth.sair.mockReset();
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [provideRouter([]), { provide: AutenticacaoService, useValue: auth }],
    }).compileComponents();
  });

  it('mostra o e-mail e esconde o link de admin para aluno', async () => {
    const fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
    const html: HTMLElement = fixture.nativeElement;
    expect(html.textContent).toContain('aluno@teste.dev');
    expect(html.querySelector('a[href="/admin"]')).toBeNull();
    expect(html.querySelector('a[href="/cursos"]')).not.toBeNull();
  });

  it('mostra o link de admin para Admin', async () => {
    role.set('Admin');
    const fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/admin"]')).not.toBeNull();
  });

  it('botão Sair chama sair()', async () => {
    const fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[data-teste="sair"]')!
      .click();
    expect(auth.sair).toHaveBeenCalledTimes(1);
  });

  it('aluno vê o link Meus cursos', async () => {
    role.set('Student');
    const fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('a[href="/aluno/matriculas"]'),
    ).not.toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('a[href="/aluno/pagamentos"]'),
    ).not.toBeNull();
  });

  it('botão do menu mobile alterna aria-expanded, aria-label e o menu', async () => {
    const fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
    const html: HTMLElement = fixture.nativeElement;
    const botao = html.querySelector<HTMLButtonElement>('button[aria-controls="menu-mobile"]')!;

    botao.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(botao.getAttribute('aria-expanded')).toBe('true');
    expect(botao.getAttribute('aria-label')).toBe('Fechar menu');
    expect(html.querySelector('#menu-mobile')).not.toBeNull();

    botao.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(botao.getAttribute('aria-expanded')).toBe('false');
    expect(botao.getAttribute('aria-label')).toBe('Abrir menu');
    expect(html.querySelector('#menu-mobile')).toBeNull();
  });
});
