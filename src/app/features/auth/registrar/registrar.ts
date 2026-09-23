import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { AutenticacaoService } from '../../../core/auth/autenticacao.service';
import { ehErroApi } from '../../../core/http/erro-api';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { nomeUsuarioValidator, senhaForteValidator, senhasIguaisValidator } from '../validadores';

type Campo = 'nome' | 'email' | 'senha' | 'confirmacaoSenha';

const CAMPO_POR_CODIGO_IDENTITY: Record<string, Campo> = {
  DuplicateUserName: 'nome',
  InvalidUserName: 'nome',
  DuplicateEmail: 'email',
  InvalidEmail: 'email',
};

function campoDoCodigo(codigo: string): Campo | null {
  if (codigo.startsWith('Password')) return 'senha';
  return CAMPO_POR_CODIGO_IDENTITY[codigo] ?? null;
}

@Component({
  selector: 'app-registrar',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HlmButtonImports,
    HlmCardImports,
    HlmInputImports,
    HlmLabelImports,
  ],
  templateUrl: './registrar.html',
})
export class RegistrarComponent {
  private readonly auth = inject(AutenticacaoService);
  private readonly notificacao = inject(NotificacaoService);
  private readonly router = inject(Router);

  protected readonly formulario = new FormGroup(
    {
      nome: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, nomeUsuarioValidator],
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      senha: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, senhaForteValidator],
      }),
      confirmacaoSenha: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: [senhasIguaisValidator] },
  );

  protected readonly enviando = signal(false);
  protected readonly erroGeral = signal<string | null>(null);
  protected readonly errosApi = signal<Partial<Record<Campo, string>>>({});

  protected async enviar(): Promise<void> {
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid || this.enviando()) return;

    this.enviando.set(true);
    this.erroGeral.set(null);
    this.errosApi.set({});
    try {
      await this.auth.registrar(this.formulario.getRawValue());
      this.notificacao.sucesso('Conta criada. Entre para continuar.');
      await this.router.navigateByUrl('/entrar');
    } catch (e) {
      this.tratarErro(e);
    } finally {
      this.enviando.set(false);
    }
  }

  protected mensagemDe(campo: Campo): string | null {
    const daApi = this.errosApi()[campo];
    if (daApi) return daApi;
    const controle = this.formulario.controls[campo];
    if (!controle.touched) return null;
    if (controle.hasError('required')) return 'Campo obrigatório.';
    if (controle.hasError('email')) return 'Informe um e-mail válido.';
    if (controle.hasError('nomeUsuario'))
      return 'Use apenas letras, números e os símbolos - . _ @ + (sem espaços).';
    if (controle.hasError('senhaForte')) {
      return 'Mínimo de 8 caracteres com maiúscula, minúscula, número e símbolo.';
    }
    if (campo === 'confirmacaoSenha' && this.formulario.hasError('senhasDiferentes')) {
      return 'As senhas não coincidem.';
    }
    return null;
  }

  private tratarErro(e: unknown): void {
    if (!ehErroApi(e)) {
      this.erroGeral.set('Não foi possível criar a conta. Tente novamente.');
      return;
    }
    if (e.status !== 422 || !e.erros) {
      this.erroGeral.set(e.detalhe);
      return;
    }
    const porCampo: Partial<Record<Campo, string>> = {};
    const gerais: string[] = [];
    for (const [codigo, mensagens] of Object.entries(e.erros)) {
      const campo = campoDoCodigo(codigo);
      if (campo) porCampo[campo] = [porCampo[campo], ...mensagens].filter(Boolean).join(' ');
      else gerais.push(...mensagens);
    }
    this.errosApi.set(porCampo);
    if (gerais.length) this.erroGeral.set(gerais.join(' '));
  }
}
