import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localePt from '@angular/common/locales/pt';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';
import { PerfilAluno } from '../../../core/api/modelos/aluno';
import { MeusPagamentosComponent } from './meus-pagamentos';

registerLocaleData(localePt, 'pt-BR');

describe('MeusPagamentosComponent', () => {
  let backend: HttpTestingController;
  let fixture: ComponentFixture<MeusPagamentosComponent>;
  let router: Router;
  const perfil = signal<PerfilAluno | null>({
    id: 4,
    nome: 'A',
    email: 'a@t.dev',
    dataCadastro: '2026-01-01',
  });
  const el = () => fixture.nativeElement as HTMLElement;
  const pagamento = (paymentId: number, status: string, paidAt: string | null) => ({
    paymentId,
    enrollmentId: 20,
    studentId: 4,
    amount: 1234.5,
    status,
    isActive: true,
    createdAt: '2026-09-01T12:00:00Z',
    paidAt,
    externalTransactionId: null,
    courseId: 7,
    courseTitulo: 'Curso Sete',
  });
  const pagina = (itens: object[], totalCount: number, pageNumber = 1) => ({
    items: itens,
    pageNumber,
    pageSize: 10,
    totalCount,
    totalPages: Math.ceil(totalCount / 10),
    hasPreviousPage: pageNumber > 1,
    hasNextPage: pageNumber * 10 < totalCount,
  });
  const requisicao = () =>
    backend.expectOne((r) => r.url === `${environment.apiUrl}/Payment/student/4`);

  async function montar(entradas: Record<string, string> = {}): Promise<void> {
    fixture = TestBed.createComponent(MeusPagamentosComponent);
    for (const [nome, valor] of Object.entries(entradas))
      fixture.componentRef.setInput(nome, valor);
    TestBed.tick();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeusPagamentosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
        { provide: PerfilAlunoService, useValue: { perfil } },
      ],
    }).compileComponents();
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('lista pagamentos com curso, valor, status e datas em pt-BR', async () => {
    await montar();
    requisicao().flush(
      pagina([pagamento(1, 'Paid', '2026-09-02T12:00:00Z'), pagamento(2, 'Pending', null)], 2),
    );
    await fixture.whenStable();
    const texto = el().textContent ?? '';
    expect(el().querySelector('a[href="/cursos/7"]')?.textContent).toContain('Curso Sete');
    expect(texto).toContain('R$');
    expect(texto).toContain('1.234,50');
    expect(texto).toContain('Pago');
    expect(texto).toContain('Pendente');
    expect(texto).toContain('01/09/2026');
    expect(texto).toContain('—');
  });

  it('traduz Failed e Refunded', async () => {
    await montar();
    requisicao().flush(pagina([pagamento(1, 'Failed', null), pagamento(2, 'Refunded', null)], 2));
    await fixture.whenStable();
    expect(el().textContent).toContain('Falhou');
    expect(el().textContent).toContain('Estornado');
  });

  it('vazio mostra Nenhum pagamento registrado.', async () => {
    await montar();
    requisicao().flush(pagina([], 0));
    await fixture.whenStable();
    expect(el().textContent).toContain('Nenhum pagamento registrado.');
  });

  it('usa a página da query string e navega para a próxima', async () => {
    await montar({ pagina: '2' });
    const req = requisicao();
    expect(req.request.params.get('PageNumber')).toBe('2');
    expect(req.request.params.get('PageSize')).toBe('10');
    req.flush(pagina([pagamento(1, 'Paid', null)], 25, 2));
    await fixture.whenStable();
    el().querySelector<HTMLButtonElement>('button[data-teste="proxima"]')!.click();
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { pagina: 3 }, queryParamsHandling: 'merge' }),
    );
  });

  it('erro permite tentar de novo', async () => {
    await montar();
    requisicao().flush({ detail: 'x' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    expect(el().textContent).toContain('Não foi possível carregar seus pagamentos');
    el().querySelector<HTMLButtonElement>('button[data-teste="recarregar"]')!.click();
    TestBed.tick();
    requisicao().flush(pagina([], 0));
  });
});
