import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { PerfilAlunoService } from '../../../core/aluno/perfil-aluno.service';
import { StatusPagamento } from '../../../core/api/modelos/pagamento';
import { ParametrosPaginacao } from '../../../core/api/modelos/paginacao';
import { PagamentoService } from '../../../core/api/pagamento.service';

const TAMANHO_PAGINA = 10;

export const ROTULOS_STATUS: Record<StatusPagamento, string> = {
  Pending: 'Pendente',
  Paid: 'Pago',
  Failed: 'Falhou',
  Refunded: 'Estornado',
};

const CLASSES_STATUS: Record<StatusPagamento, string> = {
  Pending: 'bg-muted text-muted-foreground',
  Paid: 'bg-primary text-primary-foreground',
  Failed: 'bg-destructive/10 text-destructive',
  Refunded: 'bg-secondary text-secondary-foreground',
};

@Component({
  selector: 'app-meus-pagamentos',
  imports: [CurrencyPipe, DatePipe, RouterLink, HlmButtonImports, HlmSkeletonImports],
  templateUrl: './meus-pagamentos.html',
})
export class MeusPagamentosComponent {
  private readonly pagamentoService = inject(PagamentoService);
  private readonly perfilAluno = inject(PerfilAlunoService);
  private readonly router = inject(Router);

  readonly pagina = input<string>();

  protected readonly rotulos = ROTULOS_STATUS;
  protected readonly classes = CLASSES_STATUS;
  private readonly studentId = computed(() => this.perfilAluno.perfil()?.id ?? null);
  private readonly parametros = computed<ParametrosPaginacao>(() => {
    const numero = Number(this.pagina());
    return { pagina: Number.isInteger(numero) && numero > 0 ? numero : 1, tamanho: TAMANHO_PAGINA };
  });
  protected readonly pagamentos = this.pagamentoService.listarDoAluno(
    this.studentId,
    this.parametros,
  );

  protected irPara(pagina: number): void {
    void this.router.navigate([], { queryParams: { pagina }, queryParamsHandling: 'merge' });
  }

  protected recarregar(): void {
    this.pagamentos.reload();
  }
}
