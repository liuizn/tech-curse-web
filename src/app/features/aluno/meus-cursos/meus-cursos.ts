import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';

@Component({
  selector: 'app-meus-cursos',
  imports: [RouterLink, HlmButtonImports, HlmCardImports, HlmSkeletonImports],
  templateUrl: './meus-cursos.html',
})
export class MeusCursosComponent {
  protected readonly perfilAluno = inject(PerfilAlunoService);
  protected readonly matriculas = this.perfilAluno.matriculasRecurso;
}
