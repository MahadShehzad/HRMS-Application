import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ChartSeries, compactFormat, defaultFormat, niceTicks, SERIES_COLORS, ValueFormatter } from './chart.utils';
import { elementWidth } from './element-width';

const PAD = { top: 14, right: 14, bottom: 26, left: 44 };

/**
 * Line chart for change over time. One series gets a 10% area wash; two or
 * more get a legend. Hovering shows a crosshair + tooltip with every series.
 */
@Component({
  selector: 'app-line-chart',
  template: `
    @if (series().length > 1) {
      <div class="chart-legend mb-2">
        @for (s of series(); track s.name; let i = $index) {
          <span><span class="chart-swatch" [style.background]="colorAt(i)"></span>{{ s.name }}</span>
        }
      </div>
    }
    <div class="chart" [style.height.px]="height()">
      <svg [attr.width]="width()" [attr.height]="height()" role="img" [attr.aria-label]="ariaLabel()"
           (mousemove)="onMove($event)" (mouseleave)="hover.set(-1)">
        @for (t of layout().ticks; track t.value) {
          <line class="grid-line" [attr.x1]="pad.left" [attr.x2]="width() - pad.right" [attr.y1]="t.y" [attr.y2]="t.y" />
          <text class="axis-label" [attr.x]="pad.left - 8" [attr.y]="t.y + 4" text-anchor="end">{{ axisFormat()(t.value) }}</text>
        }
        <line class="baseline" [attr.x1]="pad.left" [attr.x2]="width() - pad.right" [attr.y1]="layout().base" [attr.y2]="layout().base" />
        @for (l of labels(); track $index; let i = $index) {
          @if (layout().showLabel(i)) {
            <text class="axis-label" [attr.x]="layout().x(i)" [attr.y]="layout().base + 17" text-anchor="middle">{{ l }}</text>
          }
        }
        @if (series().length === 1) {
          <path [attr.d]="layout().paths[0].area" [attr.fill]="colorAt(0)" fill-opacity="0.1" />
        }
        @for (p of layout().paths; track $index; let i = $index) {
          <path [attr.d]="p.line" fill="none" [attr.stroke]="colorAt(i)" stroke-width="2"
                stroke-linejoin="round" stroke-linecap="round" />
          <circle [attr.cx]="p.endX" [attr.cy]="p.endY" r="4" [attr.fill]="colorAt(i)"
                  stroke="var(--bs-body-bg)" stroke-width="2" />
        }
        @if (hover() >= 0) {
          <line class="crosshair" [attr.x1]="layout().x(hover())" [attr.x2]="layout().x(hover())"
                [attr.y1]="pad.top" [attr.y2]="layout().base" />
          @for (s of series(); track s.name; let i = $index) {
            <circle [attr.cx]="layout().x(hover())" [attr.cy]="layout().y(s.values[hover()])" r="4"
                    [attr.fill]="colorAt(i)" stroke="var(--bs-body-bg)" stroke-width="2" />
          }
        }
      </svg>
      @if (hover() >= 0) {
        <div class="chart-tooltip" [style.left.px]="layout().x(hover())" [style.top.px]="pad.top + 8">
          <div class="tt-title">{{ labels()[hover()] }}</div>
          @for (s of series(); track s.name; let i = $index) {
            <div class="tt-row">
              <span class="chart-swatch" [style.background]="colorAt(i)"></span>{{ s.name }}
              <span class="tt-value">{{ format()(s.values[hover()]) }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-block' },
})
export class LineChart {
  readonly labels = input.required<string[]>();
  readonly series = input.required<ChartSeries[]>();
  readonly height = input(240);
  /** Fixed y-axis maximum (e.g. 100 for percentages); auto when omitted. */
  readonly yMax = input<number | null>(null);
  readonly colors = input<string[]>(SERIES_COLORS);
  readonly format = input<ValueFormatter>(defaultFormat);
  readonly axisFormat = input<ValueFormatter>(compactFormat);
  readonly ariaLabel = input('Line chart');

  protected readonly pad = PAD;
  protected readonly width = elementWidth();
  protected readonly hover = signal(-1);

  protected colorAt(i: number): string {
    return this.colors()[i % this.colors().length];
  }

  protected readonly layout = computed(() => {
    const labels = this.labels();
    const series = this.series();
    const w = this.width();
    const h = this.height();
    const base = h - PAD.bottom;
    const plotW = Math.max(10, w - PAD.left - PAD.right);
    const plotH = base - PAD.top;
    const max = this.yMax() ?? Math.max(0, ...series.flatMap((s) => s.values));
    const ticksRaw = niceTicks(max);
    const top = this.yMax() ?? (ticksRaw[ticksRaw.length - 1] || 1);
    const n = Math.max(1, labels.length - 1);
    const x = (i: number) => PAD.left + (plotW * i) / n;
    const y = (v: number) => base - (Math.max(0, v) / top) * plotH;
    const every = Math.max(1, Math.ceil(labels.length / Math.max(1, Math.floor(plotW / 56))));

    return {
      base,
      x,
      y,
      ticks: ticksRaw.filter((t) => t <= top).map((value) => ({ value, y: y(value) })),
      showLabel: (i: number) => i % every === 0 || i === labels.length - 1,
      paths: series.map((s) => {
        const pts = s.values.map((v, i) => `${x(i)},${y(v)}`);
        const line = pts.length ? `M${pts.join('L')}` : '';
        const last = s.values.length - 1;
        return {
          line,
          area: line ? `${line}L${x(last)},${base}L${x(0)},${base}Z` : '',
          endX: x(last),
          endY: y(s.values[last] ?? 0),
        };
      }),
    };
  });

  protected onMove(e: MouseEvent): void {
    const svg = e.currentTarget as SVGElement;
    const px = e.clientX - svg.getBoundingClientRect().left;
    const count = this.labels().length;
    if (!count) return;
    const plotW = this.width() - PAD.left - PAD.right;
    const i = Math.round(((px - PAD.left) / plotW) * (count - 1));
    this.hover.set(Math.min(count - 1, Math.max(0, i)));
  }
}
