import { Injectable } from '@angular/core';
import { toast } from '@spartan-ng/brain/sonner';

@Injectable({ providedIn: 'root' })
export class NotificacaoService {
  sucesso(mensagem: string): void {
    toast.success(mensagem);
  }

  erro(mensagem: string): void {
    toast.error(mensagem);
  }

  info(mensagem: string): void {
    toast.info(mensagem);
  }
}
