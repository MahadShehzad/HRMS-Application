import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import {
  AttendanceService,
  DepartmentService,
  EmployeeService,
  LeaveService,
  PayrollService,
  PerformanceService,
} from '../../../core/data';
import { AttendanceRecord, fullName, RATING_LABELS } from '../../../core/models';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { addDays, todayIso, yearsBetween } from '../../../core/utils/date.utils';
import {
  Avatar,
  EmptyState,
  LabelPipe,
  PageHeader,
  Rating,
  Skeleton,
  StatusBadge,
} from '../../../shared';

type Tab = 'overview' | 'attendance' | 'leave' | 'payroll' | 'performance';

@Component({
  selector: 'app-employee-detail-page',
  imports: [
    RouterLink,
    DatePipe,
    CurrencyPipe,
    DecimalPipe,
    PageHeader,
    Avatar,
    StatusBadge,
    Skeleton,
    EmptyState,
    LabelPipe,
    Rating,
  ],
  templateUrl: './employee-detail-page.html',
  styleUrl: './employee-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EmployeeDetailPage {
  protected readonly auth = inject(AuthService);
  protected readonly employees = inject(EmployeeService);
  private readonly departments = inject(DepartmentService);
  private readonly attendance = inject(AttendanceService);
  protected readonly leaves = inject(LeaveService);
  protected readonly payroll = inject(PayrollService);
  protected readonly performance = inject(PerformanceService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  /** Route param `:id` */
  readonly id = input.required<string>();

  protected readonly ratingLabels = RATING_LABELS;
  protected readonly tab = signal<Tab>('overview');
  protected readonly attendanceRecords = signal<AttendanceRecord[] | null>(null);

  protected readonly employee = computed(() => this.employees.byId().get(this.id()) ?? null);
  protected readonly name = computed(() => fullName(this.employee()));
  protected readonly department = computed(() => this.departments.byId().get(this.employee()?.departmentId ?? ''));
  protected readonly manager = computed(() => this.employees.byId().get(this.employee()?.managerId ?? ''));
  protected readonly reports = computed(() =>
    this.employees.workforce().filter((e) => e.managerId === this.id()),
  );
  protected readonly tenure = computed(() => {
    const e = this.employee();
    if (!e) return '';
    const years = yearsBetween(e.joinDate);
    return years < 1 ? 'Less than a year' : `${years} year${years > 1 ? 's' : ''}`;
  });
  protected readonly age = computed(() => (this.employee() ? yearsBetween(this.employee()!.dateOfBirth) : 0));

  /** Sensitive tabs are visible to HR/admins and to the employee themself. */
  protected readonly canSeePrivate = computed(
    () => this.auth.isManager() || this.auth.user()?.employeeId === this.id(),
  );

  protected readonly tabs = computed(() => {
    const base: { key: Tab; label: string; icon: string }[] = [{ key: 'overview', label: 'Overview', icon: 'bi-person-vcard' }];
    if (!this.canSeePrivate()) return base;
    return [
      ...base,
      { key: 'attendance', label: 'Attendance', icon: 'bi-calendar-check' },
      { key: 'leave', label: 'Leave', icon: 'bi-airplane' },
      { key: 'payroll', label: 'Payslips', icon: 'bi-receipt' },
      { key: 'performance', label: 'Performance', icon: 'bi-graph-up-arrow' },
    ] as typeof base;
  });

  protected readonly attendanceSummary = computed(() => {
    const r = this.attendanceRecords() ?? [];
    const count = (s: string) => r.filter((x) => x.status === s).length;
    const worked = r.filter((x) => x.hours > 0);
    return {
      present: count('present') + count('remote'),
      late: count('late'),
      absent: count('absent'),
      leave: count('on-leave'),
      avgHours: worked.length ? worked.reduce((s, x) => s + x.hours, 0) / worked.length : 0,
    };
  });

  protected readonly myLeaves = computed(() => this.leaves.forEmployee(this.id()));
  protected readonly balances = computed(() => this.leaves.balances(this.id()));
  protected readonly payslips = computed(() => this.payroll.forEmployee(this.id()));
  protected readonly reviews = computed(() =>
    this.performance
      .items()
      .filter((r) => r.employeeId === this.id())
      .sort((a, b) => b.period.localeCompare(a.period)),
  );

  constructor() {
    this.employees.ensureLoaded();
    this.departments.ensureLoaded();

    // Reset to overview when navigating between profiles
    effect(() => {
      this.id();
      this.tab.set('overview');
      this.attendanceRecords.set(null);
    });

    // Lazy-load tab data the first time a tab is opened
    effect(() => {
      switch (this.tab()) {
        case 'attendance':
          if (!this.attendanceRecords()) {
            this.attendance
              .forRange(addDays(todayIso(), -30), todayIso(), this.id())
              .subscribe((r) => this.attendanceRecords.set(r.sort((a, b) => b.date.localeCompare(a.date))));
          }
          break;
        case 'leave':
          this.leaves.ensureLoaded();
          break;
        case 'payroll':
          this.payroll.ensureLoaded();
          break;
        case 'performance':
          this.performance.ensureLoaded();
          break;
      }
    });
  }

  protected nameOf(id: string): string {
    return this.employees.nameOf(id);
  }

  protected async remove(): Promise<void> {
    const e = this.employee();
    if (!e) return;
    const ok = await this.confirm.ask({
      title: 'Delete employee',
      message: `Permanently delete ${fullName(e)} and all related records? This cannot be undone.`,
      confirmText: 'Delete',
      icon: 'bi-trash3',
    });
    if (!ok) return;
    this.employees.remove(e.id).subscribe(() => {
      this.toast.success(`${fullName(e)} was deleted.`);
      this.router.navigate(['/employees']);
    });
  }
}
