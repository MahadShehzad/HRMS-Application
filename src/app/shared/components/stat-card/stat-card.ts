import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tone } from '../../../core/models';
import { CountUpDirective } from '../../directives/count-up.directive';

/**
 * KPI tile: label · value (count-up) · optional context line.
 * The value animates only when it changes — that motion signals fresh data.
 */
@Component({
  selector: 'app-stat-card',
  imports: [CountUpDirective],
  template: `
    <div class="card h-100">
      <div class="card-body d-flex align-items-start gap-3">
        <div class="icon-box bg-{{ tone() }}-subtle text-{{ tone() }}-emphasis">
          <i class="bi {{ icon() }}"></i>
        </div>
        <div class="min-w-0 flex-grow-1">
          <div class="text-body-secondary small fw-medium text-truncate">{{ label() }}</div>
          @if (loading()) {
            <span class="skeleton mt-2" style="height: 1.6rem; width: 60%"></span>
          } @else {
            <div class="fs-4 fw-semibold lh-sm mt-1 text-truncate"
                 [appCountUp]="value()" [format]="format()" [decimals]="decimals()"></div>
          }
          @if (hint()) {
            <div class="small mt-1 text-truncate" [class]="hintClass()">
              @if (hintIcon()) {
                <i class="bi {{ hintIcon() }} me-1"></i>
              }{{ hint() }}
            </div>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly icon = input('bi-bar-chart');
  readonly tone = input<Tone>('primary');
  readonly format = input<'number' | 'currency' | 'percent' | 'compact'>('number');
  readonly decimals = input(0);
  readonly hint = input('');
  readonly hintIcon = input('');
  readonly hintClass = input('text-body-secondary');
  readonly loading = input(false);
}
