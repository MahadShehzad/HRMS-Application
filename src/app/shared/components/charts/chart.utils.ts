export interface ChartDatum {
  label: string;
  value: number;
}

export interface ChartSeries {
  name: string;
  values: number[];
}

export type ValueFormatter = (value: number) => string;

/** Categorical slots in fixed order — colour follows the entity, never its rank. */
export const SERIES_COLORS = Array.from({ length: 8 }, (_, i) => `var(--chart-${i + 1})`);

export const defaultFormat: ValueFormatter = (v) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(v);

export const compactFormat: ValueFormatter = (v) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v);

/** Clean, round axis ticks (0 / 5 / 10 …) covering `max`. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= top + step / 2; t += step) ticks.push(Math.round(t * 1e6) / 1e6);
  return ticks;
}

/** Column path with a 4px rounded data-end and a square baseline. */
export function columnPath(x: number, y: number, w: number, h: number, r = 4): string {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

/** Fold anything beyond `max` categories into a single "Other" bucket. */
export function foldOther(data: ChartDatum[], max = 6): ChartDatum[] {
  if (data.length <= max) return data;
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, max - 1);
  const rest = sorted.slice(max - 1).reduce((s, d) => s + d.value, 0);
  return [...head, { label: 'Other', value: rest }];
}
