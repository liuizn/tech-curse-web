import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-sem-permissao',
  imports: [RouterLink, HlmButtonImports],
  template: `
    <section class="flex flex-col items-center gap-4 py-16 text-center">
      <h1 class="text-3xl font-semibold">Sem permissão</h1>
      <p class="text-muted-foreground">Você não tem acesso a esta página.</p>
      <a hlmBtn routerLink="/">Voltar ao início</a>
    </section>
  `,
})
export class SemPermissaoComponent {}
