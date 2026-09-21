import { Routes } from '@angular/router';
import { anonimoGuard } from './core/auth/anonimo.guard';
import { autenticadoGuard } from './core/auth/autenticado.guard';
import { roleGuard } from './core/auth/role.guard';
import { PublicoLayoutComponent } from './core/layout/publico/publico';
import { ShellComponent } from './core/layout/shell/shell';
import { NaoEncontradoComponent } from './features/erros/nao-encontrado/nao-encontrado';
import { SemPermissaoComponent } from './features/erros/sem-permissao/sem-permissao';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    canActivate: [autenticadoGuard],
    children: [
      { path: '', redirectTo: 'cursos', pathMatch: 'full' },
      {
        path: 'cursos',
        loadChildren: () =>
          import('./features/catalogo/catalogo.routes').then((m) => m.CATALOGO_ROUTES),
      },
      {
        path: 'aluno',
        canMatch: [roleGuard(['Student'])],
        loadChildren: () => import('./features/aluno/aluno.routes').then((m) => m.ALUNO_ROUTES),
      },
      {
        path: 'admin',
        canMatch: [roleGuard(['Admin', 'Instructor'])],
        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
      { path: 'sem-permissao', component: SemPermissaoComponent },
    ],
  },
  {
    path: '',
    component: PublicoLayoutComponent,
    canActivate: [anonimoGuard],
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  { path: '**', component: NaoEncontradoComponent },
];
