import { Routes } from '@angular/router';
import { AlunoLayoutComponent } from './aluno-layout/aluno-layout';
import { MeusCursosComponent } from './meus-cursos/meus-cursos';

export const ALUNO_ROUTES: Routes = [
  {
    path: '',
    component: AlunoLayoutComponent,
    children: [
      { path: '', redirectTo: 'matriculas', pathMatch: 'full' },
      { path: 'matriculas', component: MeusCursosComponent },
    ],
  },
];
