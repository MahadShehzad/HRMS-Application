import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../../core/auth/auth.service';
import { AttendanceService, SHIFT_START } from '../../../../core/data';
import { AttendanceRecord } from '../../../../core/models';
import { ToastService } from '../../../../core/services/toast.service';
import { minutesBetween, todayIso } from '../../../../core/utils/date.utils';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';

/** Clock-in / clock-out card for the signed-in user, with a live clock. */
@Component({
  selector: 'app-clock-card',
  imports: [DatePipe, StatusBadge],
  templateUrl: './clock-card.html',
  styleUrl: './clock-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClockCard {
  private readonly attendance = inject(AttendanceService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly changed = output<AttendanceRecord>();

  protected readonly now = signal(new Date());
  protected readonly record = signal<AttendanceRecord | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly remote = signal(false);
  protected readonly shiftStart = SHIFT_START;

  protected readonly state = computed(() => {
    const r = this.record();
    if (!r?.checkIn) return 'out';
    return r.checkOut ? 'done' : 'in';
  });

  private readonly elapsedMinutes = computed(() => {
    const r = this.record();
    if (!r?.checkIn) return 0;
    const now = this.now();
    const end = r.checkOut ?? `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    return Math.max(0, minutesBetween(r.checkIn, end));
  });

  /** Live "time worked" while clocked in, e.g. 3h 25m. */
  protected readonly elapsed = computed(() => {
    const mins = this.elapsedMinutes();
    return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
  });

  /** 0–100 progress through an 8-hour day. */
  protected readonly dayProgress = computed(() => Math.min(100, (this.elapsedMinutes() / 480) * 100));

  constructor() {
    const timer = setInterval(() => this.now.set(new Date()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
    this.refresh();
  }

  private refresh(): void {
    const employeeId = this.auth.user()?.employeeId;
    if (!employeeId) return;
    this.attendance.query({ employeeId, date: todayIso() }).subscribe({
      next: (list) => {
        this.record.set(list[0] ?? null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected clockIn(): void {
    const employeeId = this.auth.user()?.employeeId;
    if (!employeeId || this.busy()) return;
    this.busy.set(true);
    this.attendance.clockIn(employeeId, this.remote()).subscribe({
      next: (r) => {
        this.record.set(r);
        this.busy.set(false);
        this.changed.emit(r);
        this.toast.success(`Clocked in at ${r.checkIn}. Have a great day!`);
      },
      error: () => this.busy.set(false),
    });
  }

  protected clockOut(): void {
    const r = this.record();
    if (!r || this.busy()) return;
    this.busy.set(true);
    this.attendance.clockOut(r).subscribe({
      next: (updated) => {
        this.record.set(updated);
        this.busy.set(false);
        this.changed.emit(updated);
        this.toast.success(`Clocked out at ${updated.checkOut} — ${updated.hours.toFixed(1)}h logged.`);
      },
      error: () => this.busy.set(false),
    });
  }
}
