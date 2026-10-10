import { IsoDate } from '../models';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local-time `YYYY-MM-DD` (avoids the UTC shift of `toISOString`). */
export function toIsoDate(d: Date): IsoDate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse `YYYY-MM-DD` as a local date. */
export function parseIsoDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayIso(): IsoDate {
  return toIsoDate(new Date());
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function isWeekend(iso: IsoDate): boolean {
  const day = parseIsoDate(iso).getDay();
  return day === 0 || day === 6;
}

/** The given date if it's a weekday, otherwise the following Monday. */
export function nextWorkingDay(iso: IsoDate = todayIso()): IsoDate {
  let d = iso;
  while (isWeekend(d)) d = addDays(d, 1);
  return d;
}

/** Inclusive count of Mon–Fri days between two dates. */
export function workingDaysBetween(start: IsoDate, end: IsoDate): number {
  if (!start || !end || end < start) return 0;
  let count = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (!isWeekend(d)) count++;
  }
  return count;
}

/** `YYYY-MM` for a date. */
export function monthKey(d: Date | IsoDate): string {
  const date = typeof d === 'string' ? parseIsoDate(d) : d;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function daysInMonth(period: string): number {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function workingDaysInMonth(period: string): number {
  return workingDaysBetween(`${period}-01`, `${period}-${pad(daysInMonth(period))}`);
}

export function shiftMonth(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

export function formatPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** `2026-Q3` style quarter key. */
export function quarterKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
}

export function yearsBetween(fromIso: IsoDate, to: Date = new Date()): number {
  const from = parseIsoDate(fromIso);
  let years = to.getFullYear() - from.getFullYear();
  const m = to.getMonth() - from.getMonth();
  if (m < 0 || (m === 0 && to.getDate() < from.getDate())) years--;
  return years;
}

/** Days until the next occurrence of a month/day (birthdays, anniversaries). */
export function daysUntilAnniversary(iso: IsoDate, from: Date = new Date()): number {
  const src = parseIsoDate(iso);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = new Date(start.getFullYear(), src.getMonth(), src.getDate());
  if (next < start) next = new Date(start.getFullYear() + 1, src.getMonth(), src.getDate());
  return Math.round((next.getTime() - start.getTime()) / 86_400_000);
}

/** Minutes between two `HH:mm` strings. */
export function minutesBetween(from: string, to: string): number {
  const [h1, m1] = from.split(':').map(Number);
  const [h2, m2] = to.split(':').map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
}

export function currentTime(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
