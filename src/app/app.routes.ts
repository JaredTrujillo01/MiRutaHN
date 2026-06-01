import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'inicio',
    pathMatch: 'full',
  },

  // LANDING
  {
    path: 'inicio',
    loadComponent: () =>
      import('./pages/publico/landing/landing').then((m) => m.Landing),
  },

  // AUTH
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/publico/login/login').then((m) => m.Login),
  },

  {
    path: 'registro',
    loadComponent: () =>
      import('./pages/publico/registro/registro').then((m) => m.Registro),
  },
  // PUBLICO
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/usuario/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'rutas',
    loadComponent: () =>
      import('./pages/usuario/rutas-publicas/rutas-publicas').then(
        (m) => m.RutasPublicas
      ),
  },

  {
    path: 'proponer-ruta',
    loadComponent: () =>
      import('./pages/usuario/proponer-ruta/proponer-ruta').then(
        (m) => m.ProponerRuta
      ),
  },

  {
    path: 'comunidad',
    loadComponent: () =>
      import('./pages/usuario/comunidad/comunidad').then(
        (m) => m.Comunidad
      ),
  },

  {
    path: 'notas-comunitarias',
    loadComponent: () =>
      import(
        './pages/usuario/notas-comunitarias/notas-comunitarias'
      ).then((m) => m.NotasComunitarias),
  },
  // PRIVADAS
  {
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/usuario/perfil/perfil').then((m) => m.Perfil),
  },

  // ADMIN
  {
    path: 'admin/dashboard-admin',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('./pages/admin/dashboard-admin/dashboard-admin').then(
        (m) => m.DashboardAdmin
      ),
  },
  {
    path: 'admin/rutas',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('./pages/admin/rutas/rutas').then((m) => m.Rutas),
  },
  {
    path: 'admin/usuarios',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('./pages/admin/usuarios-admin/usuarios-admin').then(
        (m) => m.UsuariosAdmin
      ),
  },
  {
    path: '**',
    redirectTo: 'inicio',
  },
];