import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { DepartmentService, EmployeeService, PayrollService } from '../../core/data';
import { fullName, Payslip } from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { downloadCsv } from '../../core/utils/csv.utils';
import { daysInMonth, formatPeriod, monthKey, shiftMonth } from '../../core/utils/date.utils';
import {
  Avatar,
  ColumnChart,
  compactFormat,
  EmptyState,
  PageHeader,
  Skeleton,
  StatCard,
  StatusBadge,
} from '../../shared';

const usd = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

@Component({
  selector: 'app-payroll-page',
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    PageHeader,
    StatCard,
    StatusBadge,
    Avatar,
    Skeleton,
    EmptyState,
    ColumnChart,
  ],
  templateUrl: './payroll-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PayrollPage {
  protected readonly auth = inject(AuthService);
  protected readonly payroll = inject(PayrollService);
  protected readonly employees = inject(EmployeeService);
  protected readonly departments = inject(DepartmentService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly currentPeriod = monthKey(new Date());
  protected readonly period = signal(shiftMonth(this.currentPeriod, -1));
  protected readonly periodLabel = computed(() => formatPeriod(this.period()));
  protected readonly search = signal('');
  protected readonly deptFilter = signal('');
  protected readonly running = signal(false);
  protected readonly paying = signal(false);
  protected readonly usd = usd;
  protected readonly compact = (v: number) => '$' + compactFormat(v);

  protected readonly loaded = computed(() => this.payroll.loaded() && this.employees.loaded());

  protected readonly slips = computed(() => this.payroll.forPeriod(this.period()));

  protected readonly rows = computed(() => {
    const q = this.search().trim().toLowerCase();
    const dept = this.deptFilter();
    const byId = this.employees.byId();
    return this.slips()
      .map((slip) => ({ slip, employee: byId.get(slip.employeeId) }))
      .filter(
        ({ employee: e }) =>
          (!dept || e?.departmentId === dept) && (!q || fullName(e).toLowerCase().includes(q) || e?.code.toLowerCase().includes(q)),
      )
      .sort((a, b) => fullName(a.employee).localeCompare(fullName(b.employee)));
  });

  protected readonly totals = computed(() => {
    const s = this.slips();
    const sum = (f: (p: Payslip) => number) => s.reduce((acc, p) => acc + f(p), 0);
    return {
      count: s.length,
      gross: sum((p) => p.gross),
      deductions: sum((p) => p.totalDeductions),
      net: sum((p) => p.net),
      unpaid: s.filter((p) => p.status !== 'paid').length,
    };
  });

  /** Employees eligible for this period who don't have a payslip yet. */
  protected readonly pendingEmployees = computed(() => {
    const period = this.period();
    const end = `${period}-${String(daysInMonth(period)).padStart(2, '0')}`;
    const has = new Set(this.slips().map((p) => p.employeeId));
    return this.employees.workforce().filter((e) => e.joinDate <= end && !has.has(e.id)).length;
  });

  /** Gross cost for the last 6 months that have payroll data. */
  protected readonly costTrend = computed(() =>
    Array.from({ length: 6 }, (_, i) => shiftMonth(this.currentPeriod, i - 5))
      .map((p) => ({
        label: formatPeriod(p).split(' ')[0].slice(0, 3),
        value: Math.round(this.payroll.forPeriod(p).reduce((s, x) => s + x.gross, 0)),
      }))
      .filter((d) => d.value > 0),
  );

  // ---- Employee self-service -------------------------------------------------
  protected readonly mySlips = computed(() => this.payroll.forEmployee(this.auth.user()?.employeeId ?? ''));
  protected readonly myYtd = computed(() => {
    const year = String(new Date().getFullYear());
    const slips = this.mySlips().filter((p) => p.period.startsWith(year));
    return {
      gross: slips.reduce((s, p) => s + p.gross, 0),
      tax: slips.reduce((s, p) => s + p.deductions.tax, 0),
      net: slips.reduce((s, p) => s + p.net, 0),
    };
  });

  constructor() {
    this.payroll.ensureLoaded();
    this.employees.ensureLoaded();
    this.departments.ensureLoaded();
  }

  protected shiftPeriod(delta: number): void {
    const next = shiftMonth(this.period(), delta);
    if (next <= this.currentPeriod) this.period.set(next);
  }

  protected deptName(id: string | undefined): string {
    return this.departments.nameOf(id);
  }

  protected async runPayroll(): Promise<void> {
    const ok = await this.confirm.ask({
      title: `Run payroll for ${this.periodLabel()}`,
      message: `Generate payslips for ${this.pendingEmployees()} employee(s) using their current salary, attendance overtime and unpaid leave.`,
      confirmText: 'Run payroll',
      tone: 'primary',
      icon: 'bi-cash-stack',
    });
    if (!ok) return;
    this.running.set(true);
    this.payroll.run(this.period()).subscribe({
      next: (r) => {
        this.running.set(false);
        this.toast.success(`Generated ${r.created} payslip(s) for ${this.periodLabel()}.`, 'Payroll complete');
      },
      error: () => this.running.set(false),
    });
  }

  protected async payAll(): Promise<void> {
    const unpaid = this.slips().filter((p) => p.status !== 'paid');
    const ok = await this.confirm.ask({
      title: 'Confirm payment',
      message: `Mark ${unpaid.length} payslip(s) totalling ${usd(unpaid.reduce((s, p) => s + p.net, 0))} as paid?`,
      confirmText: 'Mark as paid',
      tone: 'success',
      icon: 'bi-bank',
    });
    if (!ok) return;
    this.paying.set(true);
    forkJoin(unpaid.map((p) => this.payroll.markPaid(p))).subscribe({
      next: () => {
        this.paying.set(false);
        this.toast.success(`${unpaid.length} payslip(s) marked as paid.`);
      },
      error: () => this.paying.set(false),
    });
  }

  protected markPaid(p: Payslip): void {
    this.payroll.markPaid(p).subscribe(() => this.toast.success('Payslip marked as paid.'));
  }

  protected exportCsv(): void {
    downloadCsv(`payroll-${this.period()}`, this.rows(), [
      { header: 'Employee ID', value: (r) => r.employee?.code },
      { header: 'Name', value: (r) => fullName(r.employee) },
      { header: 'Department', value: (r) => this.deptName(r.employee?.departmentId) },
      { header: 'Basic', value: (r) => r.slip.earnings.basic },
      { header: 'Allowances', value: (r) => r.slip.earnings.housing + r.slip.earnings.transport },
      { header: 'Overtime', value: (r) => r.slip.earnings.overtime },
      { header: 'Bonus', value: (r) => r.slip.earnings.bonus },
      { header: 'Gross', value: (r) => r.slip.gross },
      { header: 'Tax', value: (r) => r.slip.deductions.tax },
      { header: 'Total deductions', value: (r) => r.slip.totalDeductions },
      { header: 'Net', value: (r) => r.slip.net },
      { header: 'Status', value: (r) => r.slip.status },
    ]);
  }
}
