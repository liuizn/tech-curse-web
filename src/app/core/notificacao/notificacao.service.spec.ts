import { TestBed } from '@angular/core/testing';
import { toast } from '@spartan-ng/brain/sonner';
import { NotificacaoService } from './notificacao.service';

vi.mock('@spartan-ng/brain/sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

describe('NotificacaoService', () => {
  it('delega para o toast do sonner', () => {
    const servico = TestBed.inject(NotificacaoService);
    servico.sucesso('ok');
    servico.erro('falhou');
    servico.info('aviso');
    expect(toast.success).toHaveBeenCalledWith('ok');
    expect(toast.error).toHaveBeenCalledWith('falhou');
    expect(toast.info).toHaveBeenCalledWith('aviso');
  });
});
