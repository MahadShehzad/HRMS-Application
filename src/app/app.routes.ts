import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guards';
import { AuthLayout } from './layout/auth-layout/auth-layout';
import { MainLayout } from './layout/main-layout/main-layout';

/**
 * Every feature is lazy-loaded (its own JS chunk) and preloaded in the
 * background after start-up. Manager-only areas use `canMatch` so the code
 * is never downloaded for employees.
 */
export const routes: Routes = [
  {
    path: 'auth',
    component: AuthLayout,
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes'),
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () => import('./features/dashboard/dashboard-page'),
      },
      {
        path: 'employees',
        loadChildren: () => import('./features/employees/employees.routes'),
      },
      {
        path: 'departments',
        title: 'Departments',
        canMatch: [roleGuard('admin', 'hr')],
        loadComponent: () => import('./features/departments/departments-page'),
      },
      {
        path: 'attendance',
        title: 'Attendance',
        loadComponent: () => import('./features/attendance/attendance-page'),
      },
      {
        path: 'leave',
        title: 'Leave',
        loadComponent: () => import('./features/leave/leave-page'),
      },
      {
        path: 'payroll',
        loadChildren: () => import('./features/payroll/payroll.routes'),
      },
      {
        path: 'recruitment',
        title: 'Recruitment',
        canMatch: [roleGuard('admin', 'hr')],
        loadComponent: () => import('./features/recruitment/recruitment-page'),
      },
      {
        path: 'performance',
        title: 'Performance',
        loadComponent: () => import('./features/performance/performance-page'),
      },
      {
        path: 'company',
        title: 'Announcements',
        loadComponent: () => import('./features/company/company-page'),
      },
      {
        path: 'reports',
        title: 'Reports',
        canMatch: [roleGuard('admin', 'hr')],
        loadComponent: () => import('./features/reports/reports-page'),
      },
      {
        path: 'settings',
        title: 'Settings',
        loadComponent: () => import('./features/settings/settings-page'),
      },
      {
        path: 'forbidden',
        title: 'Access denied',
        loadComponent: () => import('./features/errors/forbidden-page'),
      },
    ],
  },
  {
    path: '**',
    title: 'Page not found',
    loadComponent: () => import('./features/errors/not-found-page'),
  },
];
