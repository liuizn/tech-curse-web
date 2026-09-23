import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NotificacaoService } from '../notificacao/notificacao.service';
import { ErroApi } from './erro-api';
import { erroInterceptor } from './erro.interceptor';

describe('erroInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const notificacao = { sucesso: vi.fn(), erro: vi.fn(), info: vi.fn() };

  beforeEach(() => {
    notificacao.erro.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([erroInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificacaoService, useValue: notificacao },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  async function chamarEsperandoErro(): Promise<ErroApi> {
    return new Promise<ErroApi>((resolve) => {
      http.get('/api/x').subscribe({ error: (e) => resolve(e) });
    });
  }

  it('mapeia ProblemDetails 404', async () => {
    const promessa = chamarEsperandoErro();
    backend
      .expectOne('/api/x')
      .flush(
        { status: 404, title: 'Não encontrado', detail: 'Curso não existe.' },
        { status: 404, statusText: 'Not Found' },
      );
    const erro = await promessa;
    expect(erro).toEqual({ status: 404, titulo: 'Não encontrado', detalhe: 'Curso não existe.' });
    expect(notificacao.erro).toHaveBeenCalledWith('Curso não existe.');
  });

  it('mapeia 422 com dicionário de erros', async () => {
    const promessa = chamarEsperandoErro();
    backend.expectOne('/api/x').flush(
      {
        status: 422,
        title: 'Erro de validação',
        detail: 'Ocorreram um ou mais erros de validação.',
        errors: { Password: ['A senha e a confirmação de senha não coincidem.'] },
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    const erro = await promessa;
    expect(erro.status).toBe(422);
    expect(erro.erros).toEqual({ Password: ['A senha e a confirmação de senha não coincidem.'] });
    expect(notificacao.erro).not.toHaveBeenCalled();
  });

  it('não notifica 400 nem 401 (erros tratados pelo formulário ou pelo refresh)', async () => {
    const p1 = chamarEsperandoErro();
    backend
      .expectOne('/api/x')
      .flush({ title: 'Credenciais inválidas' }, { status: 400, statusText: 'Bad Request' });
    await p1;
    const p2 = chamarEsperandoErro();
    backend.expectOne('/api/x').flush({}, { status: 401, statusText: 'Unauthorized' });
    await p2;
    expect(notificacao.erro).not.toHaveBeenCalled();
  });

  it('usa mensagem genérica quando o corpo não é ProblemDetails', async () => {
    const promessa = chamarEsperandoErro();
    backend
      .expectOne('/api/x')
      .flush('Internal Server Error', { status: 500, statusText: 'Server Error' });
    const erro = await promessa;
    expect(erro.status).toBe(500);
    expect(erro.titulo).toBe('Erro inesperado');
    expect(erro.detalhe).toBe('Ocorreu um erro inesperado. Tente novamente.');
  });

  it('trata status 0 como falha de conexão', async () => {
    const promessa = chamarEsperandoErro();
    backend.expectOne('/api/x').error(new ProgressEvent('error'), { status: 0 });
    const erro = await promessa;
    expect(erro.status).toBe(0);
    expect(erro.detalhe).toBe('Não foi possível conectar ao servidor.');
  });
});
