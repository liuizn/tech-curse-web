import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';

@Component({
  selector: 'app-aluno-layout',
  imports: [RouterOutlet, RouterLink, HlmButtonImports, HlmCardImports, HlmSkeletonImports],
  templateUrl: './aluno-layout.html',
})
export class AlunoLayoutComponent {
  protected readonly perfilAluno = inject(PerfilAlunoService);
}
