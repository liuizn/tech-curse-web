import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';
import {
  CursoService,
  ORDEM_PADRAO,
  OrdemCursos,
  ParametrosCatalogo,
  ehOrdemCursos,
} from '../../../core/api/curso.service';

const TAMANHO_PAGINA = 12;

export const OPCOES_DE_ORDEM: { valor: OrdemCursos; rotulo: string }[] = [
  { valor: 'recentes', rotulo: 'Mais recentes' },
  { valor: 'titulo-asc', rotulo: 'Título A–Z' },
  { valor: 'titulo-desc', rotulo: 'Título Z–A' },
  { valor: 'categoria', rotulo: 'Categoria' },
];

function paginaValida(valor: string | undefined): number {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : 1;
}

@Component({
  selector: 'app-lista-cursos',
  imports: [RouterLink, HlmButtonImports, HlmCardImports, HlmSkeletonImports],
  templateUrl: './lista-cursos.html',
})
export class ListaCursosComponent {
  private readonly cursoService = inject(CursoService);
  private readonly router = inject(Router);
  private readonly perfilAluno = inject(PerfilAlunoService);

  readonly pagina = input<string>();
  readonly ordem = input<string>();
  readonly categoria = input<string>();

  protected readonly opcoesDeOrdem = OPCOES_DE_ORDEM;
  protected readonly ordemAtual = computed<OrdemCursos>(() => {
    const ordem = this.ordem();
    return ehOrdemCursos(ordem) ? ordem : ORDEM_PADRAO;
  });
  protected readonly categoriaAtual = computed(() => this.categoria()?.trim() || null);
  protected readonly parametros = computed<ParametrosCatalogo>(() => ({
    pagina: paginaValida(this.pagina()),
    tamanho: TAMANHO_PAGINA,
    ordem: this.ordemAtual(),
    categoria: this.categoriaAtual(),
  }));
  protected readonly cursos = this.cursoService.listar(this.parametros);
  protected readonly esqueletos = Array.from({ length: 6 });
  protected readonly mostraSeloMatriculado = computed(() => this.perfilAluno.estado() === 'ativo');
  protected readonly cursosMatriculados = this.perfilAluno.cursosMatriculados;

  protected irPara(pagina: number): void {
    void this.router.navigate([], { queryParams: { pagina }, queryParamsHandling: 'merge' });
  }

  protected mudarOrdem(evento: Event): void {
    const ordem = (evento.target as HTMLSelectElement).value;
    void this.router.navigate([], {
      queryParams: { ordem, pagina: null },
      queryParamsHandling: 'merge',
    });
  }

  protected filtrarPorCategoria(categoria: string | null): void {
    void this.router.navigate([], {
      queryParams: { categoria, pagina: null },
      queryParamsHandling: 'merge',
    });
  }

  protected recarregar(): void {
    this.cursos.reload();
  }
}
