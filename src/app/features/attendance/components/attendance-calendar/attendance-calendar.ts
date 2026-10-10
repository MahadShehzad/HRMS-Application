import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ATTENDANCE_STATUSES, AttendanceRecord, Holiday } from '../../../../core/models';
import { daysInMonth, isWeekend, todayIso } from '../../../../core/utils/date.utils';
import { statusTone } from '../../../../shared/components/status-badge/status-badge';
import { LabelPipe } from '../../../../shared/pipes/label.pipe';

interface DayCell {
  date: string;
  day: number;
  weekend: boolean;
  future: boolean;
  today: boolean;
  record?: AttendanceRecord;
  holiday?: Holiday;
}

const SHORT: Record<string, string> = {
  present: 'Present',
  late: 'Late',
  'half-day': 'Half',
  remote: 'Remote',
  absent: 'Absent',
  'on-leave': 'Leave',
};

/** Month grid (Mon–Sun) showing one employee's daily attendance. */
@Component({
  selector: 'app-attendance-calendar',
  imports: [LabelPipe],
  template: `
    <div class="cal-grid cal-head">
      @for (d of weekdays; track d) {
        <div>{{ d }}</div>
      }
    </div>
    <div class="cal-grid">
      @for (pad of leading(); track $index) {
        <div class="cal-cell empty" aria-hidden="true"></div>
      }
      @for (c of cells(); track c.date) {
        <div class="cal-cell" [class.weekend]="c.weekend" [class.today]="c.today" [class.future]="c.future"
             [attr.title]="c.holiday?.name ?? (c.record ? (c.record.status | label) : '')">
          <span class="cal-day">{{ c.day }}</span>
          @if (c.holiday) {
            <span class="cal-tag bg-info-subtle text-info-emphasis"><i class="bi bi-flag"></i><span class="d-none d-md-inline ms-1">Holiday</span></span>
          } @else if (c.record) {
            <span class="cal-tag bg-{{ tone(c.record.status) }}-subtle text-{{ tone(c.record.status) }}-emphasis">
              <span class="status-dot"></span><span class="d-none d-md-inline ms-1">{{ short[c.record.status] }}</span>
            </span>
            @if (c.record.hours) {
              <span class="cal-hours d-none d-sm-block">{{ c.record.hours.toFixed(1) }}h</span>
            }
          }
        </div>
      }
    </div>
    <div class="d-flex flex-wrap gap-3 mt-3 small text-body-secondary">
      @for (s of statuses; track s) {
        <span class="d-inline-flex align-items-center gap-1"><span class="status-dot text-{{ tone(s) }}"></span>{{ s | label }}</span>
      }
      <span class="d-inline-flex align-items-center gap-1"><i class="bi bi-flag text-info"></i>Holiday</span>
    </div>
  `,
  styleUrl: './attendance-calendar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceCalendar {
  /** `YYYY-MM` */
  readonly month = input.required<string>();
  readonly records = input<AttendanceRecord[]>([]);
  readonly holidays = input<Holiday[]>([]);

  protected readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  protected readonly statuses = ATTENDANCE_STATUSES;
  protected readonly short = SHORT;
  protected readonly tone = statusTone;

  /** Blank cells before the 1st so it lands on the right weekday. */
  protected readonly leading = computed(() => {
    const [y, m] = this.month().split('-').map(Number);
    const dow = new Date(y, m - 1, 1).getDay(); // 0 = Sun
    return Array.from({ length: (dow + 6) % 7 });
  });

  protected readonly cells = computed<DayCell[]>(() => {
    const month = this.month();
    const today = todayIso();
    const byDate = new Map(this.records().map((r) => [r.date, r]));
    const hol = new Map(this.holidays().map((h) => [h.date, h]));
    return Array.from({ length: daysInMonth(month) }, (_, i) => {
      const date = `${month}-${String(i + 1).padStart(2, '0')}`;
      return {
        date,
        day: i + 1,
        weekend: isWeekend(date),
        future: date > today,
        today: date === today,
        record: byDate.get(date),
        holiday: hol.get(date),
      };
    });
  });
}
