import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AttendanceService, DepartmentService, EmployeeService, HolidayService } from '../../core/data';
import { ATTENDANCE_STATUSES, AttendanceRecord, AttendanceStatus, Employee, fullName } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { downloadCsv } from '../../core/utils/csv.utils';
import {
  addDays,
  daysInMonth,
  formatPeriod,
  minutesBetween,
  monthKey,
  shiftMonth,
  todayIso,
} from '../../core/utils/date.utils';
import {
  Avatar,
  EmptyState,
  LabelPipe,
  Modal,
  PageHeader,
  Skeleton,
  StatCard,
  StatusBadge,
} from '../../shared';
import { AttendanceCalendar } from './components/attendance-calendar/attendance-calendar';
import { ClockCard } from './components/clock-card/clock-card';

interface DailyRow {
  employee: Employee;
  record: AttendanceRecord | undefined;
}

const ATTENDED: AttendanceStatus[] = ['present', 'late', 'remote', 'half-day'];

@Component({
  selector: 'app-attendance-page',
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    PageHeader,
    StatCard,
    StatusBadge,
    Avatar,
    Skeleton,
    EmptyState,
    Modal,
    LabelPipe,
    ClockCard,
    AttendanceCalendar,
  ],
  templateUrl: './attendance-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AttendancePage {
  protected readonly auth = inject(AuthService);
  private readonly attendance = inject(AttendanceService);
  protected readonly employees = inject(EmployeeService);
  protected readonly departments = inject(DepartmentService);
  protected readonly holidays = inject(HolidayService);
  private readonly toast = inject(ToastService);
  private readonly editModal = viewChild.required<Modal>('editModal');

  protected readonly statuses = ATTENDANCE_STATUSES;
  protected readonly today = todayIso();
  protected readonly view = signal<'daily' | 'monthly'>(this.auth.isManager() ? 'daily' : 'monthly');

  // ---- Daily log (managers) -------------------------------------------------
  protected readonly date = signal(todayIso());
  protected readonly dayRecords = signal<AttendanceRecord[] | null>(null);
  protected readonly search = signal('');
  protected readonly deptFilter = signal('');
  protected readonly statusFilter = signal('');

  protected readonly rows = computed<DailyRow[]>(() => {
    const date = this.date();
    const byEmp = new Map((this.dayRecords() ?? []).map((r) => [r.employeeId, r]));
    return this.employees
      .workforce()
      .filter((e) => e.joinDate <= date)
      .map((employee) => ({ employee, record: byEmp.get(employee.id) }))
      .sort((a, b) => fullName(a.employee).localeCompare(fullName(b.employee)));
  });

  protected readonly filteredRows = computed(() => {
    const q = this.search().trim().toLowerCase();
    const dept = this.deptFilter();
    const status = this.statusFilter();
    return this.rows().filter(
      ({ employee: e, record: r }) =>
        (!dept || e.departmentId === dept) &&
        (!status || (status === 'none' ? !r : r?.status === status)) &&
        (!q || fullName(e).toLowerCase().includes(q)),
    );
  });

  protected readonly dayStats = computed(() => {
    const rows = this.rows();
    const count = (s: AttendanceStatus) => rows.filter((r) => r.record?.status === s).length;
    return {
      attended: rows.filter((r) => r.record && ATTENDED.includes(r.record.status)).length,
      late: count('late'),
      remote: count('remote'),
      absent: count('absent'),
      leave: count('on-leave'),
      unmarked: rows.filter((r) => !r.record).length,
      total: rows.length,
    };
  });

  // ---- Monthly calendar -----------------------------------------------------
  protected readonly month = signal(monthKey(new Date()));
  protected readonly monthEmployeeId = signal(this.auth.user()?.employeeId ?? '');
  protected readonly monthRecords = signal<AttendanceRecord[] | null>(null);
  protected readonly monthLabel = computed(() => formatPeriod(this.month()));
  protected readonly isCurrentMonth = computed(() => this.month() >= monthKey(new Date()));

  protected readonly monthStats = computed(() => {
    const r = this.monthRecords() ?? [];
    const worked = r.filter((x) => x.hours > 0);
    const totalHours = worked.reduce((s, x) => s + x.hours, 0);
    return {
      attended: r.filter((x) => ATTENDED.includes(x.status)).length,
      late: r.filter((x) => x.status === 'late').length,
      absent: r.filter((x) => x.status === 'absent').length,
      leave: r.filter((x) => x.status === 'on-leave').length,
      totalHours,
      avgHours: worked.length ? totalHours / worked.length : 0,
    };
  });

  protected readonly sortedMonthRecords = computed(() =>
    [...(this.monthRecords() ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
  );

  protected readonly employeeOptions = computed(() =>
    [...this.employees.workforce()].sort((a, b) => fullName(a).localeCompare(fullName(b))),
  );

  // ---- Edit / regularise ----------------------------------------------------
  protected readonly editing = signal<DailyRow | null>(null);
  protected readonly saving = signal(false);
  protected readonly editForm = inject(FormBuilder).nonNullable.group({
    status: ['present' as AttendanceStatus, Validators.required],
    checkIn: [''],
    checkOut: [''],
    note: [''],
  });

  constructor() {
    this.employees.ensureLoaded();
    this.departments.ensureLoaded();
    this.holidays.ensureLoaded();

    effect(() => {
      const date = this.date();
      if (this.view() !== 'daily') return;
      untracked(() => this.loadDay(date));
    });

    effect(() => {
      const month = this.month();
      const emp = this.monthEmployeeId();
      if (this.view() !== 'monthly' || !emp) return;
      untracked(() => this.loadMonth(month, emp));
    });
  }

  private loadDay(date: string): void {
    this.dayRecords.set(null);
    this.attendance.forDate(date).subscribe((r) => this.dayRecords.set(r));
  }

  private loadMonth(month: string, employeeId: string): void {
    this.monthRecords.set(null);
    const last = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
    this.attendance.forRange(`${month}-01`, last, employeeId).subscribe((r) => this.monthRecords.set(r));
  }

  protected deptName(id: string): string {
    return this.departments.nameOf(id);
  }

  protected shiftDate(days: number): void {
    const next = addDays(this.date(), days);
    if (next <= this.today) this.date.set(next);
  }

  protected shiftMonth(delta: number): void {
    this.month.update((m) => shiftMonth(m, delta));
  }

  protected onClockChange(): void {
    if (this.view() === 'daily' && this.date() === this.today) this.loadDay(this.today);
    const me = this.auth.user()?.employeeId;
    if (this.view() === 'monthly' && me && this.monthEmployeeId() === me && this.isCurrentMonth()) {
      this.loadMonth(this.month(), me);
    }
  }

  protected openEdit(row: DailyRow): void {
    this.editing.set(row);
    this.editForm.reset({
      status: row.record?.status ?? 'present',
      checkIn: row.record?.checkIn ?? '09:00',
      checkOut: row.record?.checkOut ?? '',
      note: row.record?.note ?? '',
    });
    this.editModal().open();
  }

  protected saveEdit(): void {
    const row = this.editing();
    if (!row) return;
    const v = this.editForm.getRawValue();
    const noTimes = v.status === 'absent' || v.status === 'on-leave';
    const checkIn = noTimes ? null : v.checkIn || null;
    const checkOut = noTimes ? null : v.checkOut || null;
    if (checkIn && checkOut && checkOut <= checkIn) {
      this.toast.warning('Check-out must be after check-in.');
      return;
    }
    const hours = checkIn && checkOut ? Math.round((minutesBetween(checkIn, checkOut) / 60) * 100) / 100 : 0;
    const changes = { status: v.status, checkIn, checkOut, hours, note: v.note };

    this.saving.set(true);
    const req = row.record
      ? this.attendance.update(row.record.id, changes)
      : this.attendance.create({ employeeId: row.employee.id, date: this.date(), ...changes });
    req.subscribe({
      next: (saved) => {
        this.dayRecords.update((list) => [...(list ?? []).filter((r) => r.id !== saved.id), saved]);
        this.saving.set(false);
        this.editModal().close();
        this.toast.success(`Attendance updated for ${fullName(row.employee)}.`);
      },
      error: () => this.saving.set(false),
    });
  }

  protected exportDay(): void {
    downloadCsv(`attendance-${this.date()}`, this.filteredRows(), [
      { header: 'Employee ID', value: (r) => r.employee.code },
      { header: 'Name', value: (r) => fullName(r.employee) },
      { header: 'Department', value: (r) => this.deptName(r.employee.departmentId) },
      { header: 'Check in', value: (r) => r.record?.checkIn ?? '' },
      { header: 'Check out', value: (r) => r.record?.checkOut ?? '' },
      { header: 'Hours', value: (r) => r.record?.hours ?? 0 },
      { header: 'Status', value: (r) => r.record?.status ?? 'not marked' },
    ]);
  }
}
