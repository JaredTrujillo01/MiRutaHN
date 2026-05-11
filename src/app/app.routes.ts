import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'inicio',
        pathMatch: 'full'
    },
    {
        path: 'inicio',
        loadComponent: () => import('./pages/publico/landing/landing').then(m => m.Landing),
    },
    {
        path: 'login',
        loadComponent: () => import('./pages/publico/login/login').then(m => m.Login),
    },
    {
        path: 'registro',
        loadComponent: () => import('./pages/publico/registro/registro').then(m => m.Registro),
    },
    {
        path: 'dashboard',
        loadComponent: () => import('./pages/usuario/dashboard/dashboard').then(m => m.Dashboard),
    },
    {
        path: 'favoritos',
        loadComponent: () => import('./pages/usuario/favoritos/favoritos').then(m => m.Favoritos),
    },
    {
        path: 'reportar',
        loadComponent: () => import('./pages/usuario/reportar/reportar').then(m => m.Reportar),
    },
    {
        path: 'perfil',
        loadComponent: () => import('./pages/usuario/perfil/perfil').then(m => m.Perfil),
    },
    {
        path: '**',
        redirectTo: 'inicio',
    }
];
