import { Pipe, PipeTransform } from '@angular/core';

/** 1240000 → `1.2M`; with `currency` → `$1.2M`. */
@Pipe({ name: 'compact' })
export class CompactPipe implements PipeTransform {
  transform(value: number | null | undefined, currency?: string): string {
    if (value === null || value === undefined) return '';
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
      ...(currency ? { style: 'currency', currency } : {}),
    }).format(value);
  }
}
