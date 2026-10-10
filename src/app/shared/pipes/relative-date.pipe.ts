import { Pipe, PipeTransform } from '@angular/core';
import { parseIsoDate } from '../../core/utils/date.utils';

/** `Today`, `Yesterday`, `In 3 days`, `5 days ago`, else a short date. */
@Pipe({ name: 'relativeDate' })
export class RelativeDatePipe implements PipeTransform {
  transform(iso: string | null | undefined): string {
    if (!iso) return '';
    const date = parseIsoDate(iso.slice(0, 10));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000);
    if (diff === 0) return 'Today';
    if (diff === -1) return 'Yesterday';
    if (diff === 1) return 'Tomorrow';
    if (diff > 1 && diff < 14) return `In ${diff} days`;
    if (diff < -1 && diff > -14) return `${-diff} days ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
    });
  }
}
