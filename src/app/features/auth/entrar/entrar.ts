import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { AutenticacaoService } from '../../../core/auth/autenticacao.service';
import { rotaInicialPorRole } from '../../../core/auth/rota-inicial';
import { ehErroApi } from '../../../core/http/erro-api';

@Component({
  selector: 'app-entrar',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HlmButtonImports,
    HlmCardImports,
    HlmInputImports,
    HlmLabelImports,
  ],
  templateUrl: './entrar.html',
})
export class EntrarComponent {
  private readonly auth = inject(AutenticacaoService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);

  protected readonly formulario = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    senha: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected async enviar(): Promise<void> {
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid || this.enviando()) return;

    this.enviando.set(true);
    this.erro.set(null);
    const { email, senha } = this.formulario.getRawValue();
    try {
      await this.auth.entrar(email, senha);
      const returnUrl = this.rota.snapshot.queryParamMap.get('returnUrl');
      await this.router.navigateByUrl(returnUrl || rotaInicialPorRole(this.auth.role()));
    } catch (e) {
      this.erro.set(ehErroApi(e) ? e.detalhe : 'Não foi possível entrar. Tente novamente.');
    } finally {
      this.enviando.set(false);
    }
  }

  protected campoInvalido(nome: 'email' | 'senha'): boolean {
    const controle = this.formulario.controls[nome];
    return controle.invalid && controle.touched;
  }
}
