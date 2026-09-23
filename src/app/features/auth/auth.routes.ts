import { Routes } from '@angular/router';
import { EntrarComponent } from './entrar/entrar';
import { RegistrarComponent } from './registrar/registrar';

export const AUTH_ROUTES: Routes = [
  { path: 'entrar', component: EntrarComponent },
  { path: 'registrar', component: RegistrarComponent },
];
