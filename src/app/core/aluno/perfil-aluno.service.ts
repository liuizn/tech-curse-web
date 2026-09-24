import { HttpContext, httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { MatriculaAluno, PerfilAluno } from '../api/modelos/aluno';
import { AutenticacaoService } from '../auth/autenticacao.service';
import { extrairErroApi } from '../http/erro-api';
import { SILENCIAR_ERRO } from '../http/erro.interceptor';

export type EstadoPerfilAluno = 'inativo' | 'carregando' | 'pendente' | 'ativo' | 'erro';

@Injectable({ providedIn: 'root' })
export class PerfilAlunoService {
  private readonly auth = inject(AutenticacaoService);
  private readonly ehAluno = computed(() => this.auth.role() === 'Student');

  private readonly perfilRecurso = httpResource<PerfilAluno>(() =>
    this.ehAluno()
      ? {
          url: `${environment.apiUrl}/Student/me`,
          context: new HttpContext().set(SILENCIAR_ERRO, true),
        }
      : undefined,
  );

  readonly estado = computed<EstadoPerfilAluno>(() => {
    if (!this.ehAluno()) return 'inativo';
    // hasValue() continua true durante reload (status 'reloading'); checar antes de
    // isLoading() evita que recarregarPerfil() derrube o estado para 'carregando' e
    // destrua o <router-outlet> em AlunoLayoutComponent.
    if (this.perfilRecurso.hasValue()) return 'ativo';
    if (this.perfilRecurso.isLoading()) return 'carregando';
    const erro = this.perfilRecurso.error();
    if (erro) return extrairErroApi(erro)?.status === 404 ? 'pendente' : 'erro';
    return 'carregando';
  });

  readonly perfil = computed<PerfilAluno | null>(() =>
    this.estado() === 'ativo' ? (this.perfilRecurso.value() ?? null) : null,
  );

  readonly matriculasRecurso = httpResource<MatriculaAluno[]>(() => {
    const perfil = this.perfil();
    return perfil ? `${environment.apiUrl}/Student/${perfil.id}/enrollments` : undefined;
  });

  readonly matriculas = computed<MatriculaAluno[]>(() =>
    this.perfil() && this.matriculasRecurso.hasValue() ? this.matriculasRecurso.value() : [],
  );

  readonly cursosMatriculados = computed<ReadonlySet<number>>(
    () => new Set(this.matriculas().map((matricula) => matricula.courseId)),
  );

  recarregarPerfil(): void {
    this.perfilRecurso.reload();
  }

  recarregarMatriculas(): void {
    this.matriculasRecurso.reload();
  }
}
