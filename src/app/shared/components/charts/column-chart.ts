import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ChartDatum, columnPath, compactFormat, defaultFormat, niceTicks, ValueFormatter } from './chart.utils';
import { elementWidth } from './element-width';

const PAD = { top: 12, right: 8, bottom: 26, left: 44 };

/** Vertical columns for a single series over ordered categories (e.g. months). */
@Component({
  selector: 'app-column-chart',
  template: `
    <div class="chart" [style.height.px]="height()">
      <svg [attr.width]="width()" [attr.height]="height()" role="img" [attr.aria-label]="ariaLabel()">
        @for (t of layout().ticks; track t.value) {
          <line class="grid-line" [attr.x1]="pad.left" [attr.x2]="width() - pad.right" [attr.y1]="t.y" [attr.y2]="t.y" />
          <text class="axis-label" [attr.x]="pad.left - 8" [attr.y]="t.y + 4" text-anchor="end">{{ axisFormat()(t.value) }}</text>
        }
        <line class="baseline" [attr.x1]="pad.left" [attr.x2]="width() - pad.right" [attr.y1]="layout().base" [attr.y2]="layout().base" />
        @for (b of layout().bars; track b.label; let i = $index) {
          <path class="chart-grow" [attr.d]="b.path" [attr.fill]="color()"
                [style.opacity]="hover() >= 0 && hover() !== i ? 0.45 : 1"
                [style.animation-delay.ms]="i * 30" />
          @if (layout().showLabel(i)) {
            <text class="axis-label" [attr.x]="b.cx" [attr.y]="layout().base + 17" text-anchor="middle">{{ b.label }}</text>
          }
          <rect [attr.x]="b.bandX" [attr.y]="pad.top" [attr.width]="b.bandW" [attr.height]="layout().base - pad.top"
                fill="transparent" (mouseenter)="hover.set(i)" (mouseleave)="hover.set(-1)" />
        }
      </svg>
      @if (hover() >= 0) {
        @let b = layout().bars[hover()];
        <div class="chart-tooltip" [style.left.px]="b.cx" [style.top.px]="b.top">
          <div class="tt-title">{{ b.label }}</div>
          <div class="tt-row">
            <span class="chart-swatch" [style.background]="color()"></span>{{ seriesName() }}
            <span class="tt-value">{{ format()(b.value) }}</span>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-block' },
})
export class ColumnChart {
  readonly data = input.required<ChartDatum[]>();
  readonly height = input(240);
  readonly color = input('var(--chart-1)');
  readonly seriesName = input('Value');
  readonly format = input<ValueFormatter>(defaultFormat);
  readonly axisFormat = input<ValueFormatter>(compactFormat);
  readonly ariaLabel = input('Column chart');

  protected readonly pad = PAD;
  protected readonly width = elementWidth();
  protected readonly hover = signal(-1);

  protected readonly layout = computed(() => {
    const data = this.data();
    const w = this.width();
    const h = this.height();
    const base = h - PAD.bottom;
    const plotW = Math.max(10, w - PAD.left - PAD.right);
    const plotH = base - PAD.top;
    const ticksRaw = niceTicks(Math.max(0, ...data.map((d) => d.value)));
    const top = ticksRaw[ticksRaw.length - 1] || 1;
    const band = plotW / Math.max(1, data.length);
    const barW = Math.min(24, band * 0.6);
    const every = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(plotW / 48))));

    return {
      base,
      ticks: ticksRaw.map((value) => ({ value, y: base - (value / top) * plotH })),
      bars: data.map((d, i) => {
        const bh = (d.value / top) * plotH;
        const cx = PAD.left + band * i + band / 2;
        return {
          ...d,
          cx,
          top: base - bh,
          bandX: PAD.left + band * i,
          bandW: band,
          path: columnPath(cx - barW / 2, base - bh, barW, bh),
        };
      }),
      showLabel: (i: number) => i % every === 0,
    };
  });
}
