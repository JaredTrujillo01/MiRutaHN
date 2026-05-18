import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'inicio',
    pathMatch: 'full',
  },
  {
    path: 'inicio',
    loadComponent: () => import('./pages/publico/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/publico/login/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/publico/registro/registro').then((m) => m.Registro),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/usuario/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'favoritos',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/usuario/favoritos/favoritos').then((m) => m.Favoritos),
  },
  {
    path: 'reportar',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/usuario/reportar/reportar').then((m) => m.Reportar),
  },
  {
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/usuario/perfil/perfil').then((m) => m.Perfil),
  },
  {
    path: 'admin/rutas',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./pages/admin/rutas/rutas').then((m) => m.Rutas),
  },
  {
    path: '**',
    redirectTo: 'inicio',
  },
];
