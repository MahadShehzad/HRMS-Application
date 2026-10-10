import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Tone } from '../../../core/models';
import { LabelPipe } from '../../pipes/label.pipe';

/** One mapping for every status in the system, so colours stay consistent. */
const TONES: Record<string, Tone> = {
  // employment
  active: 'success',
  probation: 'info',
  'on-leave': 'warning',
  terminated: 'secondary',
  // attendance
  present: 'success',
  late: 'warning',
  'half-day': 'info',
  remote: 'primary',
  absent: 'danger',
  // leave
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'secondary',
  // payroll
  draft: 'secondary',
  processed: 'info',
  paid: 'success',
  // jobs
  open: 'success',
  'on-hold': 'warning',
  closed: 'secondary',
  // reviews
  submitted: 'info',
  acknowledged: 'success',
  // recruitment
  applied: 'secondary',
  screening: 'info',
  interview: 'primary',
  offer: 'warning',
  hired: 'success',
  // announcements
  general: 'secondary',
  policy: 'primary',
  event: 'info',
  urgent: 'danger',
};

export function statusTone(status: string): Tone {
  return TONES[status] ?? 'secondary';
}

/** Pill badge: coloured dot + text label (meaning never relies on colour alone). */
@Component({
  selector: 'app-status-badge',
  imports: [LabelPipe],
  template: `
    <span class="badge rounded-pill d-inline-flex align-items-center gap-1 {{ classes() }}">
      <span class="status-dot"></span>{{ label() || (status() | label) }}
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadge {
  readonly status = input.required<string>();
  readonly label = input<string>('');

  protected readonly classes = computed(() => {
    const tone = statusTone(this.status());
    return `bg-${tone}-subtle text-${tone}-emphasis`;
  });
}
