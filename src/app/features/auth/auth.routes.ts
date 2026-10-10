import { Routes } from '@angular/router';

export default [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', title: 'Sign in', loadComponent: () => import('./login/login-page') },
  {
    path: 'forgot-password',
    title: 'Reset password',
    loadComponent: () => import('./forgot-password/forgot-password-page'),
  },
] satisfies Routes;
