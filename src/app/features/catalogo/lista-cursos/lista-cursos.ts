import { Component, inject, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { CursoService } from '../../../core/api/curso.service';
import { ParametrosPaginacao } from '../../../core/api/modelos/paginacao';

const TAMANHO_PAGINA = 12;

@Component({
  selector: 'app-lista-cursos',
  imports: [HlmButtonImports, HlmCardImports, HlmSkeletonImports],
  templateUrl: './lista-cursos.html',
})
export class ListaCursosComponent {
  private readonly cursoService = inject(CursoService);

  protected readonly parametros = signal<ParametrosPaginacao>({
    pagina: 1,
    tamanho: TAMANHO_PAGINA,
  });
  protected readonly cursos = this.cursoService.listar(this.parametros);
  protected readonly esqueletos = Array.from({ length: 6 });

  protected irPara(pagina: number): void {
    this.parametros.update((atual) => ({ ...atual, pagina }));
  }

  protected recarregar(): void {
    this.cursos.reload();
  }
}
