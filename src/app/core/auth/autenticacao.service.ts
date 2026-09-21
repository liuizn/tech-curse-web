import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Role, Usuario, extrairUsuario } from './jwt';
import { Sessao, gravarSessao, lerSessao, limparSessao } from './sessao';

export interface DadosRegistro {
  nome: string;
  email: string;
  senha: string;
  confirmacaoSenha: string;
}

interface AuthOutputDto {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

@Injectable({ providedIn: 'root' })
export class AutenticacaoService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sessao = signal<Sessao | null>(lerSessao());
  private renovacaoEmAndamento: Promise<void> | null = null;

  readonly accessToken = computed(() => this.sessao()?.accessToken ?? null);
  readonly refreshToken = computed(() => this.sessao()?.refreshToken ?? null);
  readonly usuario = computed<Usuario | null>(() => {
    const token = this.accessToken();
    return token ? extrairUsuario(token) : null;
  });
  readonly role = computed<Role | null>(() => this.usuario()?.role ?? null);
  readonly estaAutenticado = computed(() => {
    const sessao = this.sessao();
    return !!sessao && !!this.usuario() && new Date(sessao.expiresAt).getTime() > Date.now();
  });
  readonly possuiRefreshToken = computed(() => !!this.sessao()?.refreshToken);

  async entrar(email: string, senha: string): Promise<void> {
    const resposta = await firstValueFrom(
      this.http.post<AuthOutputDto>(`${environment.apiUrl}/Auth/login`, { email, password: senha }),
    );
    this.aplicarSessao(resposta);
  }

  async registrar(dados: DadosRegistro): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/Auth/register`, {
        name: dados.nome,
        email: dados.email,
        role: 'Student',
        password: dados.senha,
        confirmPassword: dados.confirmacaoSenha,
      }),
    );
  }

  renovar(): Promise<void> {
    if (this.renovacaoEmAndamento) return this.renovacaoEmAndamento;
    const sessao = this.sessao();
    if (!sessao) return Promise.reject(new Error('Não há sessão para renovar.'));
    this.renovacaoEmAndamento = firstValueFrom(
      this.http.post<AuthOutputDto>(`${environment.apiUrl}/Auth/refresh`, {
        accessToken: sessao.accessToken,
        refreshToken: sessao.refreshToken,
      }),
    )
      .then((resposta) => this.aplicarSessao(resposta))
      .finally(() => (this.renovacaoEmAndamento = null));
    return this.renovacaoEmAndamento;
  }

  sair(returnUrl?: string): void {
    this.encerrarSessao();
    const extras = returnUrl ? { queryParams: { returnUrl } } : {};
    void this.router.navigate(['/entrar'], extras);
  }

  encerrarSessao(): void {
    this.sessao.set(null);
    limparSessao();
  }

  private aplicarSessao(resposta: AuthOutputDto): void {
    const sessao: Sessao = {
      accessToken: resposta.accessToken,
      refreshToken: resposta.refreshToken,
      expiresAt: resposta.expiresAt,
    };
    this.sessao.set(sessao);
    gravarSessao(sessao);
  }
}
