import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { AutenticacaoService } from '../../auth/autenticacao.service';
import { TemaService } from '../../tema/tema.service';

interface LinkNavegacao {
  rota: string;
  rotulo: string;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, HlmButtonImports],
  templateUrl: './shell.html',
})
export class ShellComponent {
  private readonly auth = inject(AutenticacaoService);
  protected readonly tema = inject(TemaService);

  protected readonly usuario = this.auth.usuario;
  protected readonly menuAberto = signal(false);

  protected readonly links = computed<LinkNavegacao[]>(() => {
    const role = this.auth.role();
    const base: LinkNavegacao[] = [{ rota: '/cursos', rotulo: 'Cursos' }];
    if (role === 'Admin' || role === 'Instructor') base.push({ rota: '/admin', rotulo: 'Admin' });
    if (role === 'Student') {
      base.push(
        { rota: '/aluno/matriculas', rotulo: 'Meus cursos' },
        { rota: '/aluno/pagamentos', rotulo: 'Pagamentos' },
      );
    }
    return base;
  });

  protected alternarMenu(): void {
    this.menuAberto.update((aberto) => !aberto);
  }

  protected sair(): void {
    this.auth.sair();
  }
}
