import { Pipe, PipeTransform } from '@angular/core';

/** `on-leave` → `On leave`, `full-time` → `Full-time`, `half_day` → `Half day` */
export function toLabel(value: string | null | undefined): string {
  if (!value) return '';
  const keepHyphen = /^(full|part)-time$/.test(value);
  const text = keepHyphen ? value : value.replace(/[-_]/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

@Pipe({ name: 'label' })
export class LabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return toLabel(value);
  }
}
