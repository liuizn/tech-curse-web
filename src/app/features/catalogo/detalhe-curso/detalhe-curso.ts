import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';
import { CursoService } from '../../../core/api/curso.service';
import { MatriculaService } from '../../../core/api/matricula.service';
import { AutenticacaoService } from '../../../core/auth/autenticacao.service';
import { extrairErroApi } from '../../../core/http/erro-api';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';

@Component({
  selector: 'app-detalhe-curso',
  imports: [DatePipe, RouterLink, HlmButtonImports, HlmCardImports, HlmSkeletonImports],
  templateUrl: './detalhe-curso.html',
})
export class DetalheCursoComponent {
  private readonly cursoService = inject(CursoService);
  private readonly matriculaService = inject(MatriculaService);
  private readonly notificacao = inject(NotificacaoService);
  private readonly auth = inject(AutenticacaoService);
  protected readonly perfilAluno = inject(PerfilAlunoService);

  readonly id = input.required<string>();

  protected readonly idDoCurso = computed(() => {
    const numero = Number(this.id());
    return Number.isInteger(numero) && numero > 0 ? numero : null;
  });
  protected readonly curso = this.cursoService.obter(this.idDoCurso);
  protected readonly naoEncontrado = computed(
    () => this.idDoCurso() === null || extrairErroApi(this.curso.error())?.status === 404,
  );
  protected readonly ehAluno = computed(() => this.auth.role() === 'Student');
  protected readonly jaMatriculado = computed(() => {
    const id = this.idDoCurso();
    return id !== null && this.perfilAluno.cursosMatriculados().has(id);
  });
  protected readonly enviando = signal(false);

  protected async matricular(): Promise<void> {
    const cursoId = this.idDoCurso();
    const perfil = this.perfilAluno.perfil();
    if (cursoId === null || !perfil || this.enviando()) return;
    this.enviando.set(true);
    try {
      await this.matriculaService.matricular(cursoId, perfil.id);
      this.notificacao.sucesso('Matrícula realizada');
      this.perfilAluno.recarregarMatriculas();
    } catch {
      // o erroInterceptor já mostrou o toast com a mensagem da API
    } finally {
      this.enviando.set(false);
    }
  }
}
