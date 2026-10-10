import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { DepartmentService, EmployeeService, PayrollService } from '../../../core/data';
import { fullName } from '../../../core/models';
import { EmptyState, PageHeader, Skeleton, StatusBadge } from '../../../shared';

/** Printable payslip. Employees can only open their own. */
@Component({
  selector: 'app-payslip-page',
  imports: [RouterLink, CurrencyPipe, DatePipe, PageHeader, StatusBadge, Skeleton, EmptyState],
  templateUrl: './payslip-page.html',
  styleUrl: './payslip-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PayslipPage {
  private readonly auth = inject(AuthService);
  protected readonly payroll = inject(PayrollService);
  private readonly employees = inject(EmployeeService);
  private readonly departments = inject(DepartmentService);

  readonly id = input.required<string>();

  protected readonly appName = environment.appName;
  protected readonly loaded = computed(() => this.payroll.loaded() && this.employees.loaded());
  protected readonly slip = computed(() => this.payroll.byId().get(this.id()) ?? null);
  protected readonly employee = computed(() => this.employees.byId().get(this.slip()?.employeeId ?? '') ?? null);
  protected readonly name = computed(() => fullName(this.employee()));
  protected readonly department = computed(() => this.departments.nameOf(this.employee()?.departmentId));
  protected readonly allowed = computed(
    () => this.auth.isManager() || this.slip()?.employeeId === this.auth.user()?.employeeId,
  );

  protected readonly earnings = computed(() => {
    const e = this.slip()?.earnings;
    if (!e) return [];
    return [
      { label: 'Basic salary', value: e.basic },
      { label: 'Housing allowance', value: e.housing },
      { label: 'Transport allowance', value: e.transport },
      { label: 'Overtime', value: e.overtime },
      { label: 'Bonus', value: e.bonus },
    ].filter((r) => r.value > 0);
  });

  protected readonly deductions = computed(() => {
    const d = this.slip()?.deductions;
    if (!d) return [];
    return [
      { label: 'Income tax', value: d.tax },
      { label: 'Pension (5%)', value: d.pension },
      { label: 'Health insurance', value: d.insurance },
      { label: 'Other', value: d.other },
    ].filter((r) => r.value > 0);
  });

  constructor() {
    this.payroll.ensureLoaded();
    this.employees.ensureLoaded();
    this.departments.ensureLoaded();
  }

  protected print(): void {
    window.print();
  }
}
