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
        path: '**',
        redirectTo: 'inicio',
    }
];
