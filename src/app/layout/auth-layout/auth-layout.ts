import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Split-screen layout for sign-in screens; the brand panel hides on small screens. */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {
  protected readonly highlights = [
    { icon: 'bi-people', title: 'Unified employee records', text: 'Profiles, documents and reporting lines in one place.' },
    { icon: 'bi-calendar2-check', title: 'Attendance & leave', text: 'Clock-ins, balances and approvals without spreadsheets.' },
    { icon: 'bi-cash-coin', title: 'Payroll in minutes', text: 'Run payroll, review payslips and track costs by team.' },
  ];
}
