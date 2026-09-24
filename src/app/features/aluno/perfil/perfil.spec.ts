import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';
import { AlunoApiService } from '../../../core/api/aluno-api.service';
import { PerfilAluno } from '../../../core/api/modelos/aluno';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { PerfilComponent } from './perfil';

registerLocaleData(localePt, 'pt-BR');

describe('PerfilComponent', () => {
  const perfil = signal<PerfilAluno | null>({
    id: 6,
    nome: 'Aluno Seis',
    email: 'seis@t.dev',
    dataCadastro: '2026-05-04T12:00:00Z',
  });
  const perfilAluno = { perfil, recarregarPerfil: vi.fn() };
  const alunoApi = { atualizarNome: vi.fn<(id: number, nome: string) => Promise<void>>() };
  const notificacao = { sucesso: vi.fn(), erro: vi.fn(), info: vi.fn() };
  let fixture: ComponentFixture<PerfilComponent>;
  const el = () => fixture.nativeElement as HTMLElement;
  const campo = () => el().querySelector<HTMLInputElement>('input[formControlName="nome"]')!;
  const salvar = () => el().querySelector<HTMLButtonElement>('button[type="submit"]')!;

  async function digitar(valor: string): Promise<void> {
    campo().value = valor;
    campo().dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    perfilAluno.recarregarPerfil.mockReset();
    alunoApi.atualizarNome.mockReset();
    notificacao.sucesso.mockReset();
    await TestBed.configureTestingModule({
      imports: [PerfilComponent],
      providers: [
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: PerfilAlunoService, useValue: perfilAluno },
        { provide: AlunoApiService, useValue: alunoApi },
        { provide: NotificacaoService, useValue: notificacao },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PerfilComponent);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('mostra os dados e o nome atual no campo', () => {
    expect(el().textContent).toContain('seis@t.dev');
    expect(el().textContent).toContain('04/05/2026');
    expect(campo().value).toBe('Aluno Seis');
  });

  it('Salvar fica desabilitado sem alteração', () => {
    expect(salvar().disabled).toBe(true);
  });

  it('salva o nome novo, avisa e recarrega o perfil', async () => {
    alunoApi.atualizarNome.mockResolvedValue();
    await digitar('Nome Novo');
    expect(salvar().disabled).toBe(false);
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(alunoApi.atualizarNome).toHaveBeenCalledWith(6, 'Nome Novo');
    expect(notificacao.sucesso).toHaveBeenCalledWith('Perfil atualizado');
    expect(perfilAluno.recarregarPerfil).toHaveBeenCalled();
  });

  it('nome vazio é inválido e não chama a API', async () => {
    await digitar('   ');
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(alunoApi.atualizarNome).not.toHaveBeenCalled();
    expect(el().textContent).toContain('Informe o nome.');
  });

  it('422 mostra a mensagem da API no campo', async () => {
    alunoApi.atualizarNome.mockRejectedValue({
      status: 422,
      titulo: 'Erro de validação',
      detalhe: 'x',
      erros: { Nome: ['O nome deve ter no máximo 100 caracteres.'] },
    });
    await digitar('Outro Nome');
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el().textContent).toContain('O nome deve ter no máximo 100 caracteres.');
  });
});
