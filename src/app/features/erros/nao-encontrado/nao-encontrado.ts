import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-nao-encontrado',
  imports: [RouterLink, HlmButtonImports],
  template: `
    <section class="flex flex-col items-center gap-4 py-16 text-center">
      <h1 class="text-3xl font-semibold">Página não encontrada</h1>
      <p class="text-muted-foreground">O endereço acessado não existe.</p>
      <a hlmBtn routerLink="/">Voltar ao início</a>
    </section>
  `,
})
export class NaoEncontradoComponent {}
