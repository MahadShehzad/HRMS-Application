import { Routes } from '@angular/router';

export default [
  { path: '', title: 'Payroll', loadComponent: () => import('./payroll-page') },
  { path: 'payslips/:id', title: 'Payslip', loadComponent: () => import('./payslip/payslip-page') },
] satisfies Routes;
