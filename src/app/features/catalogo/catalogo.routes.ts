import { Routes } from '@angular/router';
import { DetalheCursoComponent } from './detalhe-curso/detalhe-curso';
import { ListaCursosComponent } from './lista-cursos/lista-cursos';

export const CATALOGO_ROUTES: Routes = [
  { path: '', component: ListaCursosComponent },
  { path: ':id', component: DetalheCursoComponent },
];
