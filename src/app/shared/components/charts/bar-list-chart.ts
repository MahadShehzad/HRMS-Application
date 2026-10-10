import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ChartDatum, defaultFormat, ValueFormatter } from './chart.utils';

/**
 * Horizontal bar list — best for ranking categories with long names
 * (departments, leave types). Single series → no legend; the card title names it.
 */
@Component({
  selector: 'app-bar-list-chart',
  template: `
    <div class="chart d-flex flex-column gap-2" role="list">
      @for (d of rows(); track d.label; let i = $index) {
        <div class="bar-row" role="listitem" (mouseenter)="hover.set(i)" (mouseleave)="hover.set(-1)"
             [class.dim]="hover() >= 0 && hover() !== i">
          <div class="d-flex justify-content-between small mb-1 gap-2">
            <span class="text-truncate">{{ d.label }}</span>
            <span class="fw-semibold tabular-nums text-body-emphasis">
              {{ format()(d.value) }}
              @if (hover() === i) {
                <span class="text-body-secondary fw-normal ms-1">· {{ d.share }}%</span>
              }
            </span>
          </div>
          <div class="track">
            <div class="bar chart-grow-x" [style.width.%]="d.pct" [style.background]="color()"
                 [style.animation-delay.ms]="i * 40"></div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .bar-row { transition: opacity .15s ease; cursor: default; }
    .bar-row.dim { opacity: .45; }
    .track { height: 10px; border-radius: 0 4px 4px 0; background: var(--bs-tertiary-bg); }
    .bar { height: 100%; border-radius: 0 4px 4px 0; min-width: 2px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarListChart {
  readonly data = input.required<ChartDatum[]>();
  readonly color = input('var(--chart-1)');
  readonly format = input<ValueFormatter>(defaultFormat);
  readonly sort = input(true);

  protected readonly hover = signal(-1);

  protected readonly rows = computed(() => {
    const data = this.sort() ? [...this.data()].sort((a, b) => b.value - a.value) : this.data();
    const max = Math.max(1, ...data.map((d) => d.value));
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    return data.map((d) => ({
      ...d,
      pct: (d.value / max) * 100,
      share: Math.round((d.value / total) * 100),
    }));
  });
}
