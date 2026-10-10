import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/auth.guards';
import { unsavedChangesGuard } from '../../core/auth/unsaved-changes.guard';

export default [
  {
    path: '',
    title: 'Employees',
    loadComponent: () => import('./employee-list/employee-list-page'),
  },
  {
    path: 'new',
    title: 'New employee',
    canMatch: [roleGuard('admin', 'hr')],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./employee-form/employee-form-page'),
  },
  {
    path: ':id',
    title: 'Employee profile',
    loadComponent: () => import('./employee-detail/employee-detail-page'),
  },
  {
    path: ':id/edit',
    title: 'Edit employee',
    canMatch: [roleGuard('admin', 'hr')],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./employee-form/employee-form-page'),
  },
] satisfies Routes;
