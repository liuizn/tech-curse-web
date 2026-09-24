import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';
import { AlunoApiService } from '../../../core/api/aluno-api.service';
import { extrairErroApi } from '../../../core/http/erro-api';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';

@Component({
  selector: 'app-perfil',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    HlmButtonImports,
    HlmCardImports,
    HlmInputImports,
    HlmLabelImports,
  ],
  templateUrl: './perfil.html',
})
export class PerfilComponent {
  private readonly perfilAluno = inject(PerfilAlunoService);
  private readonly alunoApi = inject(AlunoApiService);
  private readonly notificacao = inject(NotificacaoService);

  protected readonly perfil = this.perfilAluno.perfil;
  protected readonly formulario = new FormGroup({
    nome: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
  });
  private readonly nome = this.formulario.controls.nome;
  protected readonly enviando = signal(false);
  protected readonly erroDaApi = signal<string | null>(null);

  constructor() {
    effect(() => {
      const perfil = this.perfil();
      if (perfil && !this.nome.dirty) this.nome.setValue(perfil.nome);
    });
  }

  protected podeSalvar(): boolean {
    const perfil = this.perfil();
    const valor = this.nome.value.trim();
    return (
      !!perfil &&
      !this.enviando() &&
      valor.length > 0 &&
      valor.length <= 100 &&
      valor !== perfil.nome
    );
  }

  protected mensagemDoCampo(): string | null {
    if (this.erroDaApi()) return this.erroDaApi();
    if (!this.nome.touched) return null;
    if (this.nome.value.trim().length === 0) return 'Informe o nome.';
    if (this.nome.hasError('maxlength')) return 'Use no máximo 100 caracteres.';
    return null;
  }

  protected async salvar(): Promise<void> {
    this.nome.markAsTouched();
    const perfil = this.perfil();
    if (!perfil || !this.podeSalvar()) return;
    this.enviando.set(true);
    this.erroDaApi.set(null);
    try {
      await this.alunoApi.atualizarNome(perfil.id, this.nome.value.trim());
      this.notificacao.sucesso('Perfil atualizado');
      this.nome.markAsPristine();
      this.perfilAluno.recarregarPerfil();
    } catch (e) {
      const erro = extrairErroApi(e);
      if (erro?.status === 422) {
        this.erroDaApi.set(
          (erro.erros?.['Nome'] ?? erro.erros?.['nome'] ?? [erro.detalhe]).join(' '),
        );
      }
    } finally {
      this.enviando.set(false);
    }
  }
}
