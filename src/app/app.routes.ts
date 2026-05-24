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
    path: 'colaborar',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/usuario/colaborar/colaborar').then((m) => m.Colaborar),
  },
  {
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/usuario/perfil/perfil').then((m) => m.Perfil),
  },
  {
    path: 'admin/dashboard-admin',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('./pages/admin/dashboard-admin/dashboard-admin').then((m) => m.DashboardAdmin),
  },
  {
    path: 'admin/rutas',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./pages/admin/rutas/rutas').then((m) => m.Rutas),
  },
  {
    path: 'admin/conductores',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./pages/admin/conductores/conductores').then((m) => m.Conductores),
  },
  {
    path: 'admin/reportes',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./pages/admin/reportes-admin/reportes-admin').then((m) => m.ReportesAdmin),
  },
  {
    path: 'admin/usuarios',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./pages/admin/usuarios-admin/usuarios-admin').then((m) => m.UsuariosAdmin),
  },
  {
    path: '**',
    redirectTo: 'inicio',
  },
];
