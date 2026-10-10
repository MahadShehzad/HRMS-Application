import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import {
  AnnouncementService,
  AttendanceService,
  DepartmentService,
  EmployeeService,
  HolidayService,
  JobService,
  LeaveService,
  PayrollService,
} from '../../core/data';
import { AttendanceRecord, EMPLOYMENT_TYPES, fullName, LeaveRequest, Payslip } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import {
  addDays,
  daysUntilAnniversary,
  isWeekend,
  monthKey,
  parseIsoDate,
  todayIso,
  yearsBetween,
} from '../../core/utils/date.utils';
import {
  Avatar,
  BarListChart,
  DonutChart,
  EmptyState,
  LabelPipe,
  LineChart,
  RelativeDatePipe,
  Skeleton,
  StatCard,
  StatusBadge,
  toLabel,
} from '../../shared';
import { ClockCard } from '../attendance/components/clock-card/clock-card';

const ATTENDED = new Set(['present', 'late', 'remote', 'half-day']);

@Component({
  selector: 'app-dashboard-page',
  imports: [
    RouterLink,
    DatePipe,
    NgTemplateOutlet,
    StatCard,
    LineChart,
    BarListChart,
    DonutChart,
    Avatar,
    StatusBadge,
    Skeleton,
    EmptyState,
    LabelPipe,
    RelativeDatePipe,
    ClockCard,
  ],
  templateUrl: './dashboard-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DashboardPage {
  protected readonly auth = inject(AuthService);
  private readonly employees = inject(EmployeeService);
  private readonly departments = inject(DepartmentService);
  protected readonly leaves = inject(LeaveService);
  private readonly jobs = inject(JobService);
  protected readonly payroll = inject(PayrollService);
  private readonly attendance = inject(AttendanceService);
  protected readonly announcements = inject(AnnouncementService);
  private readonly holidays = inject(HolidayService);
  private readonly toast = inject(ToastService);

  protected readonly today = new Date();
  protected readonly isManager = this.auth.isManager;
  protected readonly firstName = computed(() => this.auth.user()?.name.split(' ')[0] ?? '');
  protected readonly greeting = computed(() => {
    const h = this.today.getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  });

  protected readonly todayRecords = signal<AttendanceRecord[] | null>(null);
  protected readonly trendRecords = signal<AttendanceRecord[] | null>(null);
  protected readonly myMonthRecords = signal<AttendanceRecord[] | null>(null);
  protected readonly reviewing = signal<string | null>(null);

  protected readonly coreLoaded = computed(
    () => this.employees.loaded() && this.departments.loaded() && this.leaves.loaded(),
  );

  // ---- Organisation KPIs ----------------------------------------------------
  protected readonly headcount = computed(() => this.employees.workforce().length);
  protected readonly newThisMonth = computed(() => {
    const m = monthKey(this.today);
    return this.employees.workforce().filter((e) => e.joinDate.startsWith(m)).length;
  });
  protected readonly presentToday = computed(
    () => (this.todayRecords() ?? []).filter((r) => ATTENDED.has(r.status)).length,
  );
  protected readonly attendanceRate = computed(() =>
    this.headcount() ? Math.round((this.presentToday() / this.headcount()) * 100) : 0,
  );
  protected readonly outToday = computed(() => this.leaves.onLeaveOn(todayIso()));
  protected readonly openPositions = computed(() =>
    this.jobs
      .items()
      .filter((j) => j.status === 'open')
      .reduce((s, j) => s + j.openings, 0),
  );
  protected readonly openJobs = computed(() => this.jobs.items().filter((j) => j.status === 'open').length);

  // ---- Charts ---------------------------------------------------------------
  protected readonly trend = computed(() => {
    const records = this.trendRecords();
    if (!records) return null;
    const byDate = new Map<string, { total: number; attended: number }>();
    for (const r of records) {
      const d = byDate.get(r.date) ?? { total: 0, attended: 0 };
      d.total++;
      if (ATTENDED.has(r.status)) d.attended++;
      byDate.set(r.date, d);
    }
    const dates = [...byDate.keys()].sort().slice(-14);
    return {
      labels: dates.map((d) => parseIsoDate(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      series: [
        {
          name: 'Attendance rate',
          values: dates.map((d) => {
            const v = byDate.get(d)!;
            return Math.round((v.attended / v.total) * 1000) / 10;
          }),
        },
      ],
    };
  });

  protected readonly byDepartment = computed(() =>
    this.departments.items().map((d) => ({
      label: d.name,
      value: this.employees.workforce().filter((e) => e.departmentId === d.id).length,
    })),
  );

  protected readonly byType = computed(() =>
    EMPLOYMENT_TYPES.map((t) => ({
      label: toLabel(t),
      value: this.employees.workforce().filter((e) => e.employmentType === t).length,
    })),
  );

  protected readonly percentFormat = (v: number) => `${v}%`;

  // ---- Lists ----------------------------------------------------------------
  protected readonly pendingLeaves = computed(() => this.leaves.pending().slice(0, 5));

  protected readonly celebrations = computed(() => {
    const items: { name: string; kind: 'birthday' | 'anniversary'; inDays: number; years: number; id: string }[] = [];
    for (const e of this.employees.workforce()) {
      const b = daysUntilAnniversary(e.dateOfBirth);
      if (b <= 30) items.push({ id: e.id, name: fullName(e), kind: 'birthday', inDays: b, years: 0 });
      const a = daysUntilAnniversary(e.joinDate);
      const years = yearsBetween(e.joinDate, parseIsoDate(addDays(todayIso(), a)));
      if (a <= 30 && years >= 1) items.push({ id: e.id, name: fullName(e), kind: 'anniversary', inDays: a, years });
    }
    return items.sort((x, y) => x.inDays - y.inDays).slice(0, 6);
  });

  protected readonly latestNews = computed(() =>
    [...this.announcements.items()]
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.publishedOn.localeCompare(a.publishedOn))
      .slice(0, 3),
  );

  protected readonly upcomingHolidays = computed(() =>
    this.holidays
      .items()
      .filter((h) => h.date >= todayIso())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4),
  );

  // ---- Personal (employee) KPIs --------------------------------------------
  private readonly myId = computed(() => this.auth.user()?.employeeId ?? '');
  protected readonly myAnnualLeft = computed(
    () => this.leaves.balances(this.myId()).find((b) => b.config.type === 'annual')?.remaining ?? 0,
  );
  protected readonly myLeaves = computed(() => this.leaves.forEmployee(this.myId()).slice(0, 4));
  protected readonly myDaysPresent = computed(
    () => (this.myMonthRecords() ?? []).filter((r) => ATTENDED.has(r.status)).length,
  );
  protected readonly myAvgHours = computed(() => {
    const done = (this.myMonthRecords() ?? []).filter((r) => r.hours > 0);
    return done.length ? done.reduce((s, r) => s + r.hours, 0) / done.length : 0;
  });
  protected readonly myLastPayslip = computed<Payslip | null>(
    () => this.payroll.forEmployee(this.myId())[0] ?? null,
  );

  constructor() {
    this.employees.ensureLoaded();
    this.departments.ensureLoaded();
    this.leaves.ensureLoaded();
    this.announcements.ensureLoaded();
    this.holidays.ensureLoaded();
    this.payroll.ensureLoaded();

    if (this.isManager()) {
      this.jobs.ensureLoaded();
      this.loadTodayAttendance();
      // 3 weeks back gives at least 14 working days
      this.attendance.forRange(addDays(todayIso(), -21), todayIso()).subscribe((r) => {
        this.trendRecords.set(r.filter((x) => !isWeekend(x.date) && x.date < todayIso()));
      });
    } else {
      const first = `${monthKey(this.today)}-01`;
      this.attendance.forRange(first, todayIso(), this.myId()).subscribe((r) => this.myMonthRecords.set(r));
    }
  }

  protected nameOf(id: string): string {
    return this.employees.nameOf(id);
  }

  protected designationOf(id: string): string {
    return this.employees.byId().get(id)?.designation ?? '';
  }

  protected loadTodayAttendance(): void {
    this.attendance.forDate(todayIso()).subscribe((r) => this.todayRecords.set(r));
  }

  protected onClockChange(): void {
    if (this.isManager()) this.loadTodayAttendance();
  }

  protected review(leave: LeaveRequest, status: 'approved' | 'rejected'): void {
    const me = this.auth.user()?.employeeId;
    if (!me) return;
    this.reviewing.set(leave.id);
    this.leaves.review(leave.id, status, me).subscribe({
      next: () => {
        this.reviewing.set(null);
        this.toast.success(`Leave request ${status} for ${this.nameOf(leave.employeeId)}.`);
      },
      error: () => this.reviewing.set(null),
    });
  }
}
