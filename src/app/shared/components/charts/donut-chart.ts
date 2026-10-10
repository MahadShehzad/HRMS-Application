import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ChartDatum, defaultFormat, foldOther, SERIES_COLORS, ValueFormatter } from './chart.utils';

/**
 * Part-to-whole donut (≤ 6 slices; extras fold into "Other").
 * Legend is always shown; hovering a slice or legend row focuses it and
 * puts its value in the centre.
 */
@Component({
  selector: 'app-donut-chart',
  template: `
    <div class="chart donut-layout">
      <div class="position-relative flex-shrink-0" [style.width.px]="size()" [style.height.px]="size()">
        <svg [attr.width]="size()" [attr.height]="size()" [attr.viewBox]="'0 0 ' + size() + ' ' + size()"
             role="img" [attr.aria-label]="ariaLabel()" style="transform: rotate(-90deg)">
          <circle [attr.cx]="c()" [attr.cy]="c()" [attr.r]="r()" fill="none"
                  stroke="var(--bs-tertiary-bg)" [attr.stroke-width]="thickness()" />
          @for (s of slices(); track s.label; let i = $index) {
            <circle class="slice" [attr.cx]="c()" [attr.cy]="c()" [attr.r]="r()" fill="none"
                    [attr.stroke]="colorAt(i)" [attr.stroke-width]="hover() === i ? thickness() + 4 : thickness()"
                    [attr.stroke-dasharray]="s.dash" [attr.stroke-dashoffset]="s.offset"
                    [style.opacity]="hover() >= 0 && hover() !== i ? 0.35 : 1"
                    (mouseenter)="hover.set(i)" (mouseleave)="hover.set(-1)" />
          }
        </svg>
        <div class="position-absolute top-50 start-50 translate-middle text-center" style="pointer-events: none">
          @if (hover() >= 0) {
            <div class="fs-5 fw-semibold lh-1">{{ format()(slices()[hover()].value) }}</div>
            <div class="small text-body-secondary mt-1">{{ slices()[hover()].pct }}%</div>
          } @else {
            <div class="fs-4 fw-semibold lh-1">{{ format()(total()) }}</div>
            <div class="small text-body-secondary mt-1">{{ centerLabel() }}</div>
          }
        </div>
      </div>
      <ul class="list-unstyled mb-0 flex-grow-1 w-100 small">
        @for (s of slices(); track s.label; let i = $index) {
          <li class="d-flex align-items-center gap-2 py-1 legend-row" [class.dim]="hover() >= 0 && hover() !== i"
              (mouseenter)="hover.set(i)" (mouseleave)="hover.set(-1)">
            <span class="chart-swatch" [style.background]="colorAt(i)"></span>
            <span class="text-truncate">{{ s.label }}</span>
            <span class="ms-auto fw-semibold tabular-nums">{{ format()(s.value) }}</span>
            <span class="text-body-secondary tabular-nums" style="width: 3rem; text-align: right">{{ s.pct }}%</span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    /* Side-by-side only when the card itself is wide enough, not the viewport */
    :host { display: block; container-type: inline-size; }
    .donut-layout { display: flex; flex-direction: column; align-items: center; gap: 1.25rem; }
    @container (min-width: 440px) { .donut-layout { flex-direction: row; gap: 1.5rem; } }
    .slice { transition: opacity .15s ease, stroke-width .15s ease; cursor: pointer; }
    .legend-row { transition: opacity .15s ease; cursor: default; }
    .legend-row.dim { opacity: .45; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonutChart {
  readonly data = input.required<ChartDatum[]>();
  readonly size = input(168);
  readonly thickness = input(20);
  readonly centerLabel = input('Total');
  readonly colors = input<string[]>(SERIES_COLORS);
  readonly format = input<ValueFormatter>(defaultFormat);
  readonly ariaLabel = input('Donut chart');

  protected readonly hover = signal(-1);
  protected readonly c = computed(() => this.size() / 2);
  protected readonly r = computed(() => this.size() / 2 - this.thickness() / 2 - 3);
  protected readonly total = computed(() => this.data().reduce((s, d) => s + d.value, 0));

  protected colorAt(i: number): string {
    return this.colors()[i % this.colors().length];
  }

  protected readonly slices = computed(() => {
    const data = foldOther(this.data().filter((d) => d.value > 0));
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const circ = 2 * Math.PI * this.r();
    const gap = data.length > 1 ? 2 : 0; // 2px surface gap between slices
    let acc = 0;
    return data.map((d) => {
      const len = (d.value / total) * circ;
      const slice = {
        ...d,
        pct: Math.round((d.value / total) * 100),
        dash: `${Math.max(0, len - gap)} ${circ}`,
        offset: -acc,
      };
      acc += len;
      return slice;
    });
  });
}
